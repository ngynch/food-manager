const request = require('supertest')
const app = require('app.js')


describe('Endpoints', () => {
    test("It should response the GET method for all articles", () => {
        return request(app)
            .get("/article")
            .then(response => {
                expect(response.statusCode).toBe(200);
            });
    });
});
