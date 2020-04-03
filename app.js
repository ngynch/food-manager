const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(express.json());
const sqlite3 =  require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
const orders = require('./orders');
const articles = require('./articles');
const workers = require('./workers');
const csv = require('csv-parser');
const fs = require('fs');

db.serialize(() => {

    db.run('CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, alias TEXT NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, worker INTEGER NOT NULL)');
    db.run('CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, created TEXT NOT NULL, modified TEXT NOT NULL, name TEXT, street TEXT, zipcode TEXT, city TEXT, telephone TEXT, status TEXT NOT NULL)');
    db.run('CREATE TABLE order_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, order_id INTEGER NOT NULL, article_id INTEGER NOT NULL, article_status TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (article_id) REFERENCES articles (id))');

    //Speisekarte import
    fs.createReadStream('speisekarte.csv')
    .pipe(csv())
    .on('data', (row) => {
        db.run('INSERT INTO articles(alias, name, price, worker) VALUES(?,?,?,?)',[row.number, row.name, row.price, row.worker]);
    });
});

app.use(cors())

app.use(function (req, res, next) {
    console.log(`${req.method} ${req.originalUrl} ${Date(Date.now()).slice(0,24)}`);
    next();
})

app.get('/', function (req, res) {
    return res.json("Hello World");
});

app.route('/order/:orderId?')
    .get(function (req, res) {
        if (req.params.orderId!= undefined) {
            orders.getOrderById(req, res, db);
        } else {
            orders.getOrders(res, db);
        }
    })
    .post(function (req, res) {
        orders.createOrder(req, res, db);
    })
    .put(function (req, res) {
        orders.updateOrder(req, res, db);
    })

app.route('/article/:articleId?')
    .get(function (req, res) {
        if (!isNaN(req.params.articleId)) {
            articles.getArticleById(req, res, db);
        } else {
            articles.getArticles(res, db);
        }
    });

app.route('/worker/:workerId?')
    .get(function (req, res) {/*IN_PROGRESS=BOTH WORKERS WORKING, 1 = Worker One Done, 2 = Worker Two Done*/
        if (req.params.workerId != 1 && req.params.workerId != 2) {
            return res.status(400).json({"message":"Worker ID does not exist"});
        }
        workers.getWorkerById(req, res, db);
    })
    .put(function (req, res) {/*fix nested functions*/
        workers.updateWorkerById(req, res, db);
    });

app.listen(port, () => console.log(`Food Manager listening on port ${port}!`));
//db.close();
