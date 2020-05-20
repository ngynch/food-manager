const request = require('supertest')
const app = require('app.js')
const fs = require('fs');
const csv = require('csv-parser');
let articles = Array.from(Array(97).keys()).map(x=>++x); // 97 articles in speisekarte.csv

describe("It should response the GET method for article", () => {
    test.each(articles)("each ID", (a) => {
        return request(app)
        .get(`/article/${a}`)
        .then(response => {
            expect(response.statusCode).toBe(200)
        });
    });
    test("It should response the GET method for all articleID", () => {
        return request(app)
            .get("/article")
            .then(response => {
                expect(response.statusCode).toBe(200);
            });
    });
});
