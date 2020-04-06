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
    db.run('CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, created INTEGER NOT NULL, modified INTEGER NOT NULL, name TEXT, street TEXT, zipcode TEXT, city TEXT, telephone TEXT, status TEXT NOT NULL)');
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
            orders.getOrderArticlesById(req, db)
            .then((articles) => {
                if (articles.length == 0) {
                    return res.status(400).json({"message":"OrderID does not exist"});
                } else {
                    orders.getOrderDetails(req, db)
                    .then(details => {
                        details["articles"] = articles;
                        return res.json(details);
                    })
                }
            });
        } else {
            orders.getOrders(db)
            .then((list_orders) => {
                return res.json(list_orders);
            });
        }
    })
    .post(function (req, res) {
        orders.createOrder(req, db)
        .then(() => {
            return res.json({"message":"Order created"})
        }, () => {
            res.status(400).json({"message":"Could not create order"});
        })
    })
    .put(function (req, res) {
        orders.orderExist(req, db)
            .then(() => {
                    orders.updateOrder(req, db)
                    .then(() => {
                        return res.json({"message":"Order updated"});
                    }, () => {
                        console.log("Problem with updating order")
                        res.json("Could not update order")
                    })
                },() => {
                    return res.status(400).json({"messsage":"Order ID does not exists yet"});
                });
    })

app.route('/article/:articleId?')
    .get(function (req, res) {
        if (!isNaN(req.params.articleId)) {
            articles.getArticleById(req, db)
            .then(article => {
                return res.json(article)
            }, () => {
                return res.status(400).json({"message":"This Article ID does not exist"});
            });
        } else {
            articles.getArticles(db)
            .then((articles) => {
                return res.json(articles);
            });
        }
    });

app.route('/worker/:workerId?')
    .get(function (req, res) {/*IN_PROGRESS=BOTH WORKERS WORKING, 1 = Worker One Done, 2 = Worker Two Done*/
        if (req.params.workerId != 1 && req.params.workerId != 2) {
            return res.status(400).json({"message":"Worker ID does not exist"});
        }
        workers.getWorkerById(req, db)
        .then((result) => {
            return res.json(result)
        });
    })
    .put(function (req, res) {/*fix nested functions*/
        workers.updateWorkerById(req, db)
        .then((result) => {
            return res.json(result);
        }, (err) => {
            return res.status(400).json(err);
        })
    });

app.listen(port, () => console.log(`Food Manager listening on port ${port}!`));
//db.close();
