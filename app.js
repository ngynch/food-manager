const express = require('express');
const app = express();
const port = 3000;

app.get('/', function (req, res) {
    res.send('Hello World');
});

app.route('/order/:orderId')
    .get(function (req, res) {
        res.send('Get order by Id');
    })
    .post(function (req, res) {
        res.send('Create order');
    })
    .put(function (req, res) {
        res.send('Update order');
    })
    .delete(function (req, res) {
        res.send('Delete order');
    });

app.route('/article/:articleId')
    .get(function (req, res) {
        res.send('Get article by Id');
    })
    .post(function (req, res) {
        res.send('Create article');
    })
    .put(function (req, res) {
        res.send('Update article');
    })
    .delete(function (req, res) {
        res.send('Delete article');
    });

app.route('/worker')
    .get(function (req, res) {
        res.send('Get current active order');
    })
    .put(function (req, res) {
        res.send('Next order');
    });

app.route('/manager')
    .get(function (req, res) {
        res.send('Get all active orders');
    })
    .put(function (req, res) {
        res.send('Prioritize take away orders');
    });

app.listen(port, () => console.log(`Food Manager listening on port ${port}!`));
