const express = require("express");
const request = require("supertest");

const propertiesRouter = require("../src/routes/properties");
const pool = require("../src/db/mysql");

jest.mock("../src/db/mysql", () => ({
  query: jest.fn(),
}));

function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api/properties", propertiesRouter);

  return app;
}

describe("properties routes", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    pool.query.mockReset();
  });

  describe("GET /api/properties", () => {
    test("returns paginated properties", async () => {
      pool.query.mockResolvedValueOnce([[{ total: 2 }]]).mockResolvedValueOnce([
        [
          {
            L_ListingID: "1001",
            L_City: "Beverly Hills",
            L_SystemPrice: 900000,
          },
        ],
      ]);

      const response = await request(app)
        .get("/api/properties?limit=20&offset=0")
        .expect(200);

      expect(response.body).toMatchObject({
        total: 2,
        limit: 20,
        offset: 0,
      });
      expect(response.body.results).toHaveLength(1);
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining("LIMIT ? OFFSET ?"),
        [20, 0],
      );
    });

    test.each([
      ["city", "Beverly Hills", "LOWER(TRIM(L_City)) = LOWER(TRIM(?))"],
      ["zipcode", "90210", "L_Zip = ?"],
      ["minPrice", "500000", "L_SystemPrice >= ?"],
      ["maxPrice", "1000000", "L_SystemPrice <= ?"],
      ["beds", "3", "L_Keyword2 >= ?"],
      ["baths", "2.5", "LM_Dec_3 >= ?"],
    ])("filters by %s", async (param, value, sqlFragment) => {
      pool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[{}]]);

      await request(app)
        .get(`/api/properties?${param}=${encodeURIComponent(value)}`)
        .expect(200);

      const expectedValue = ["minPrice", "maxPrice", "beds", "baths"].includes(
        param,
      )
        ? Number(value)
        : value;

      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(sqlFragment),
        expect.arrayContaining([expectedValue]),
      );
    });

    test("applies validated sorting", async () => {
      pool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[{}]]);

      await request(app)
        .get("/api/properties?sortBy=L_SystemPrice&sortOrder=DESC")
        .expect(200);

      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining("ORDER BY L_SystemPrice DESC"),
        [20, 0],
      );
    });

    test.each([
      [
        "/api/properties?limit=abc",
        "limit must be an integer between 1 and 100",
      ],
      [
        "/api/properties?limit=101",
        "limit must be an integer between 1 and 100",
      ],
      ["/api/properties?offset=-1", "offset must be a non-negative integer"],
      ["/api/properties?minPrice=cheap", "minPrice must be a number"],
      ["/api/properties?maxPrice=expensive", "maxPrice must be a number"],
      ["/api/properties?beds=2.5", "beds must be an integer"],
      ["/api/properties?baths=many", "baths must be a number"],
      ["/api/properties?sortBy=ListPrice", "Invalid sortBy field"],
      [
        "/api/properties?sortBy=L_SystemPrice&sortOrder=SIDEWAYS",
        "sortOrder must be ASC or DESC",
      ],
    ])("returns 400 for invalid input %s", async (url, message) => {
      const response = await request(app).get(url).expect(400);

      expect(response.body.error).toBe(message);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/properties/:id", () => {
    test("returns a property by listing ID", async () => {
      pool.query.mockResolvedValueOnce([
        [
          {
            L_ListingID: "1001",
            L_City: "Beverly Hills",
          },
        ],
      ]);

      const response = await request(app)
        .get("/api/properties/1001")
        .expect(200);

      expect(response.body.L_ListingID).toBe("1001");
      expect(pool.query).toHaveBeenCalledWith(
        "SELECT * FROM rets_property WHERE L_ListingID = ?",
        ["1001"],
      );
    });

    test("returns 404 when the property does not exist", async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get("/api/properties/9999")
        .expect(404);

      expect(response.body.error).toBe("Property not found");
    });

    test("returns 400 for an invalid listing ID", async () => {
      const response = await request(app)
        .get("/api/properties/not-a-number")
        .expect(400);

      expect(response.body.error).toBe("Listing ID must contain only numbers");
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/properties/:id/openhouses", () => {
    test("returns open houses for an existing property", async () => {
      pool.query
        .mockResolvedValueOnce([[{ L_ListingID: "1001" }]])
        .mockResolvedValueOnce([
          [
            {
              L_ListingID: "1001",
              OpenHouseDate: "2026-09-10",
              OH_StartTime: "13:00:00",
            },
          ],
        ]);

      const response = await request(app)
        .get("/api/properties/1001/openhouses")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].OpenHouseDate).toBe("2026-09-10");
    });

    test("returns an empty array when a property has no open houses", async () => {
      pool.query
        .mockResolvedValueOnce([[{ L_ListingID: "1001" }]])
        .mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get("/api/properties/1001/openhouses")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test("returns 404 for an unknown property", async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get("/api/properties/9999/openhouses")
        .expect(404);

      expect(response.body.error).toBe("Property not found");
    });
  });
});
