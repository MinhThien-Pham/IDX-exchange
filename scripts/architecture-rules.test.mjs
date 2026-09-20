import assert from 'node:assert/strict';
import test from 'node:test';
import { boundaryViolation, importsFrom } from './architecture-rules.mjs';

test('finds type imports, re-exports, side effects and dynamic imports without matching comments', () => {
  const imports = importsFrom(`
    // import fake from 'not-a-dependency';
    import type { Request } from 'express';
    export { something } from './adapter.js';
    import './styles.css';
    const client = import('./client.js');
  `);
  assert.deepEqual(imports, ['express', './adapter.js', './styles.css', './client.js']);
});

test('keeps backend business layers framework-independent and rejects outward dependencies', () => {
  const useCase = 'backend/src/modules/listings/application/use-cases/search.ts';
  assert.equal(boundaryViolation(useCase, '../../domain/listing.js'), null);
  assert.equal(boundaryViolation(useCase, '../../../../shared/errors/application-error.js'), null);
  for (const dependency of ['express', '@idx/contracts', '../../infrastructure/repository.js'])
    assert.ok(boundaryViolation(useCase, dependency));
  assert.ok(
    boundaryViolation(
      'backend/src/modules/listings/domain/listing.ts',
      '../application/ports/repository.js',
    ),
  );
  assert.ok(
    boundaryViolation(
      'backend/src/modules/listings/presentation/controller.ts',
      '../infrastructure/repository.js',
    ),
  );
  assert.ok(boundaryViolation('backend/src/modules/listings/presentation/controller.ts', 'pg'));
  assert.ok(
    boundaryViolation('backend/src/modules/listings/infrastructure/repository.ts', 'express'),
  );
  assert.ok(
    boundaryViolation(
      'backend/src/platform/http/context.ts',
      '../../modules/listings/domain/listing.js',
    ),
  );
});

test('keeps modules independent while allowing wiring at the composition root', () => {
  assert.ok(
    boundaryViolation(
      'backend/src/modules/open-houses/application/get.ts',
      '../../listings/domain/listing.js',
    ),
  );
  assert.equal(
    boundaryViolation('backend/src/app.ts', './modules/listings/infrastructure/repository.js'),
    null,
  );
});

test('allows frontend feature composition through public entries and rejects deep coupling', () => {
  const view = 'frontend/src/features/listings/components/Detail.tsx';
  assert.equal(boundaryViolation(view, '../../open-houses'), null);
  assert.equal(boundaryViolation(view, '../hooks/useListings'), null);
  assert.ok(boundaryViolation(view, '../../open-houses/components/OpenHouses'));
  assert.ok(boundaryViolation(view, '../../../pages/DetailPage'));
  assert.equal(boundaryViolation('frontend/src/pages/Listings.tsx', '../features/listings'), null);
  assert.ok(
    boundaryViolation('frontend/src/pages/Listings.tsx', '../features/listings/components/View'),
  );
});

test('keeps pure models and utilities independent of browser state and HTTP clients', () => {
  const model = 'frontend/src/features/listings/model/search.ts';
  assert.equal(boundaryViolation(model, '@idx/contracts'), null);
  assert.equal(boundaryViolation(model, '../../../shared/utils/query-string'), null);
  assert.ok(boundaryViolation(model, '../hooks/useListings'));
  assert.ok(boundaryViolation(model, 'react'));
  assert.ok(boundaryViolation('frontend/src/shared/utils/query-string.ts', '../api/client'));
  assert.ok(boundaryViolation('frontend/src/shared/utils/query-string.ts', 'react'));
  assert.ok(boundaryViolation('frontend/src/shared/ui/Modal.tsx', '../../features/listings'));
});

test('keeps shared contracts and frontend isolated from server implementation', () => {
  assert.equal(boundaryViolation('packages/contracts/src/index.ts', 'zod'), null);
  assert.ok(boundaryViolation('packages/contracts/src/index.ts', 'express'));
  assert.ok(boundaryViolation('packages/contracts/src/index.ts', '../../../backend/src/app.js'));
  assert.ok(boundaryViolation('frontend/src/shared/api/client.ts', '../../../../backend/src/app'));
});
