const request = require('supertest')
const app = require('app.js')
const fs = require('fs');
const csv = require('csv-parser');
let count = 1;
fs.createReadStream('speisekarte.csv')
.pipe(csv())
.on('data', (row) => {
    count++;
})
.on('end', () => {
    console.log(count)
    describe.each([[1,200],[2,200]])("testing every available ID for get article/?id", (a,b) => {
        test("It should response the GET method for every available ID", () => {

            return request(app)
            .get(`/article/${a}`)
            .then(response => {
                expect(response.statusCode).toBe(200)
            });

        });
    });
});
