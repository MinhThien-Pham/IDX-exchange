import path from 'node:path';
import ts from 'typescript';

export function importsFrom(source) {
  return ts.preProcessFile(source, true, true).importedFiles.map(({ fileName }) => fileName);
}

/** Source paths are relative to the repository root and use forward slashes. */
export function boundaryViolation(file, dependency) {
  const target = dependency.startsWith('.')
    ? path.posix.normalize(path.posix.join(path.posix.dirname(file), dependency))
    : dependency === '@idx/contracts'
      ? 'packages/contracts/src/index.ts'
      : null;
  const inDirectory = (directory) => target?.startsWith(`${directory}/`);
  const databasePackage = /^(pg|drizzle-orm|mysql2)(\/|$)/.test(dependency);
  const uiPackage =
    /^(react|react-dom|react-router-dom|@tanstack\/react-query|lucide-react)(\/|$)/.test(
      dependency,
    );
  const publicFeature =
    target && /^frontend\/src\/features\/[^/]+(?:\/index(?:\.[jt]sx?)?)?$/.test(target);
  const backendModule = file.match(/^backend\/src\/modules\/([^/]+)\/([^/]+)/);

  if (file.startsWith('packages/contracts/src/')) {
    if (target && !inDirectory('packages/contracts/src'))
      return 'shared contracts cannot depend on an application';
    if (databasePackage || uiPackage || /^express(\/|$)/.test(dependency))
      return 'shared contracts describe data without HTTP, UI, or persistence frameworks';
  }

  if (file.startsWith('backend/src/')) {
    if (target && !inDirectory('backend/src') && !inDirectory('packages/contracts/src'))
      return 'backend cannot depend on frontend or workspace internals';

    if (file.startsWith('backend/src/shared/')) {
      if (!inDirectory('backend/src/shared'))
        return 'backend shared code must remain independent of frameworks and adapters';
    }

    if (file.startsWith('backend/src/platform/') && inDirectory('backend/src/modules'))
      return 'platform code cannot depend on business modules';

    if (backendModule) {
      const [, module, layer] = backendModule;
      const ownModule = `backend/src/modules/${module}`;
      if (inDirectory('backend/src/modules') && !inDirectory(ownModule))
        return "modules communicate through injected ports, not another module's internals";

      if (layer === 'domain' || layer === 'application') {
        const allowed =
          inDirectory(`${ownModule}/domain`) ||
          inDirectory('backend/src/shared') ||
          (layer === 'application' && inDirectory(`${ownModule}/application`));
        if (!allowed) return `${layer} must depend only on its inner layers and shared core`;
      }
      if (
        layer === 'presentation' &&
        (inDirectory(`${ownModule}/infrastructure`) ||
          inDirectory('backend/src/platform/db') ||
          databasePackage)
      )
        return 'controllers and routes must reach persistence through use cases';
      if (
        layer === 'infrastructure' &&
        (inDirectory(`${ownModule}/presentation`) || /^express(\/|$)/.test(dependency))
      )
        return 'persistence adapters cannot depend on HTTP presentation';
    }
  }

  if (file.startsWith('frontend/src/')) {
    if (target && !inDirectory('frontend/src') && !inDirectory('packages/contracts/src'))
      return 'frontend cannot depend on backend or workspace internals';

    if (
      file.startsWith('frontend/src/shared/') &&
      target &&
      !inDirectory('frontend/src/shared') &&
      !inDirectory('packages/contracts/src')
    )
      return 'shared frontend code cannot depend on app, pages, or features';
    if (
      file.startsWith('frontend/src/shared/utils/') &&
      (uiPackage ||
        (inDirectory('frontend/src/shared') && !inDirectory('frontend/src/shared/utils')))
    )
      return 'pure utilities cannot depend on HTTP clients, hooks, or UI';

    const feature = file.match(/^frontend\/src\/features\/([^/]+)\/([^/]+)/);
    if (feature) {
      const [, name, layer] = feature;
      const ownFeature = `frontend/src/features/${name}`;
      if (inDirectory('frontend/src/app') || inDirectory('frontend/src/pages'))
        return 'features cannot depend on app or page composition';
      if (inDirectory('frontend/src/features') && !inDirectory(ownFeature) && !publicFeature)
        return "use the other feature's public index instead of a deep import";

      if (layer === 'model') {
        if (
          target &&
          !inDirectory(`${ownFeature}/model`) &&
          !inDirectory('frontend/src/shared/utils') &&
          !inDirectory('packages/contracts/src')
        )
          return 'feature models must stay independent of UI, hooks, and HTTP';
        if (uiPackage) return 'feature models cannot depend on UI or server-state frameworks';
      }
      if (
        layer === 'api' &&
        (uiPackage ||
          (target &&
            !inDirectory(`${ownFeature}/api`) &&
            !inDirectory('frontend/src/shared/api') &&
            !inDirectory('frontend/src/shared/utils') &&
            !inDirectory('packages/contracts/src')))
      )
        return 'feature API adapters cannot depend on views or stateful hooks';
      if (layer === 'hooks' && inDirectory(`${ownFeature}/components`))
        return 'hooks cannot depend on their rendered components';
    }
    if (
      /^frontend\/src\/(app|pages)\//.test(file) &&
      inDirectory('frontend/src/features') &&
      !publicFeature
    )
      return 'compose features through their public index';
  }
  return null;
}
