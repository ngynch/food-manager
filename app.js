const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(express.json());

const sqlite3 =  require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
const orders = require('./orders')
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
            var articles = [];
            new Promise(function(resolve, reject) {
                sql = 'SELECT *,articles.name as name,order_articles.id as id FROM order_articles INNER JOIN articles ON order_articles.article_id = articles.id LEFT JOIN orders ON orders.id = order_articles.order_id WHERE order_articles.order_id = (?)'

                db.each(sql, [req.params.orderId], function(err, row){
                    if (err) {console.log("hiereerrr");reject(err);}
                    articles.push({
                        "id": row.id,
                        "status": row.article_status,
                        "alias": row.alias,
                        "name": row.name,
                        "amount": row.amount,
                        "price": row.price*row.amount
                    });

                }, (err, rowCount) => {
                    resolve(articles)
                });
            })
            .then((articles) => {
                if (articles.length == 0) {
                    return res.status(400).json({"message":"OrderID does not exist"});
                } else {
                        db.get('SELECT * from orders WHERE orders.id = (?)', req.params.orderId, (err, row) => {
                            let response = {
                                    "id": row.id,
                                    "status":row.status,
                                    "type": row.type,
                                    "created": row.created,
                                    "modified": row.modified,
                                    "name": row.name,
                                    "street": row.street,
                                    "zipcode": row.zipcode,
                                    "city": row.city,
                                    "telephone": row.telephone,
                                    "articles": articles
                                };

                            return res.json(response)
                        });
                }
            });
        } else {

            var list_orders = [];
            new Promise((resolve,reject) => {

                let sql = 'SELECT *,orders.name as ordername,articles.name as articlename FROM orders ';
                sql +=  'INNER JOIN order_articles ON order_articles.order_id = orders.id ';
                sql += 'INNER JOIN articles ON articles.id = order_articles.article_id';

                db.each(sql, (err, row) => {
                    let flag = false
                    for(item of list_orders){
                        if (item["id"] == row.order_id){
                            flag = true
                            item["articles"].push({
                                "id": row.id,
                                "status": row.article_status,
                                "alias": row.alias,
                                "name": row.articlename,
                                "amount": row.amount,
                                "price": row.price*row.amount
                            })
                        }
                    }
                    if (!flag) {
                        list_orders.push({
                            "id": row.order_id,
                            "status":row.status,
                            "type": row.type,
                            "created": row.created,
                            "modified": row.modified,
                            "name": row.ordername,
                            "street": row.street,
                            "zipcode": row.zipcode,
                            "city": row.city,
                            "telephone": row.telephone,
                            "articles": [{
                                            "id": row.id,
                                            "status": row.article_status,
                                            "alias": row.alias,
                                            "name": row.articlename,
                                            "amount": row.amount,
                                            "price": row.price*row.amount
                                        }]
                            })
                    }
                }, (err, rowCount) => {
                    resolve();
                })
            })
            .then(() => {
                return res.json(list_orders)
            });
        }
    })
    .post(function (req, res) {
          new Promise((resolve, reject) => {

              let sql = 'INSERT INTO orders(type, created, modified, name, street, zipcode, city, telephone, status) VALUES(?,?,?,?,?,?,?,?,?)'
              let time = Math.round(Date.now());

              db.run(sql, [req.body.type, time, time, req.body.name, req.body.street, req.body.zipcode, req.body.city, req.body.telephone, "TO_DO"], function(err) {
                  resolve(this.lastID);
              });
          })
          .then((order_id) => {
              for (article of req.body.articles) {
                  db.run('INSERT INTO order_articles(amount, order_id, article_id, article_status) VALUES(?,?,?,?)', [article.amount, order_id, article.id, "TO_DO"]);
              }
              return res.json({"message":"Order Created"});
          })

    })
    .put(function (req, res) {

        let sql = 'SELECT * FROM orders WHERE id = (?)'
        let flag = false

        new Promise((resolve,reject) => {
            db.get(sql, [req.params.orderId], (err, row) => {
                flag = row != undefined ? true : false;
                resolve();
            })
        })
        .then(() => {
            if (!flag){
                return res.status(400).json({"message":"Order ID does not exist yet"});
            } else {
                db.serialize(() => {
                    let sql2 = 'UPDATE orders SET status = (?), modified = (?) WHERE id = (?)';
                    db.run(sql2,[req.body.status, Math.round(Date.now()), req.params.orderId]);

                    let sql3 = 'DELETE FROM order_articles WHERE order_id = (?)';
                    db.run(sql3, req.params.orderId);

                    for (article of req.body.articles) {
                        let sql4 = 'INSERT INTO order_articles(amount, order_id, article_id, article_status) VALUES(?,?,?,?)';
                        db.run(sql4, [article.amount, req.params.orderId, article.id, req.body.status]);
                    }
                    return res.json({"message":"Order Updated"});
                })
            }
        })
    })

app.route('/article/:articleId?')
    .get(function (req, res) {
        if (!isNaN(req.params.articleId)) {

            var article = {}

            new Promise((resolve,reject) => {
                db.each('SELECT * FROM articles WHERE id = (?)',req.params.articleId, (err, row) => {
                    article = {
                        "id" : row.id,
                        "alias" : row.alias,
                        "name" : row.name,
                        "price" : row.price
                    };
                }, (err,rowCount) => {
                    if (rowCount == 0) {reject();}
                    resolve();
                });
            })
            .then(() => {
                return res.json(article)
            }, () => {
                return res.status(400).json({"message":"This Article ID does not exist"});
            });
        } else {

            var articles = []

            new Promise((resolve, reject) => {
                db.each('SELECT * FROM articles', (err, row) => {
                    articles.push({
                        "id": row.id,
                        "alias": row.alias,
                        "name": row.name,
                        "price": row.price
                    })
                }, (err, rowCount) => {
                    resolve();
                });
            })
            .then(() => {
                return res.json(articles);
            });
        };
    });

app.route('/worker/:workerId?')
    .get(function (req, res) {/*IN_PROGRESS=BOTH WORKERS WORKING, 1 = Worker One Done, 2 = Worker Two Done*/
        if (req.params.workerId != 1 && req.params.workerId != 2) {
            return res.status(400).json({"message":"Worker ID does not exist"});
        }

        let articles = [];
        let sql = 'SELECT *,order_articles.id as id,articles.name as name FROM order_articles ';
        sql += 'INNER JOIN articles ON order_articles.article_id = articles.id ';
        sql += 'INNER JOIN orders ON orders.id = order_articles.order_id ';
        sql += 'WHERE (order_articles.article_status = "IN_PROGRESS" OR order_articles.article_status = (?)) ';
        sql += 'AND (articles.worker = (?) OR articles.worker = "12")'

        let workerArticles = [];
        db.each(sql,[-req.params.workerId+3, req.params.workerId], (err, row) => {
            workerArticles.push({
                "id": row.id,
                "status": row.article_status,
                "type": row.type,
                "alias": row.alias,
                "name": row.name,
                "amount": row.amount,
                "created": row.created,
                "modified": row.modified
            });
        }, (err, rowCount) => {
            if (workerArticles.length == 0) {return res.json({"message":"No Order in progress for this worker"});}
                return res.json(workerArticles);
        })
    })
    .put(function (req, res) {/*fix nested functions*/
        db.serialize(() => {

            let sql1 = 'SELECT * FROM order_articles INNER JOIN articles ON order_articles.article_id = articles.id ';
            sql1 += 'WHERE (order_articles.id = (?)) AND (articles.worker = (?) OR articles.worker = "12")';

            db.get(sql1, [req.body.id,req.params.workerId], (err, row) => {

                let orderId;
                let newStatus = 400;

                if (row == undefined) {
                    return res.status(400).json({"message": "Order_article ID not found for this worker"})
                }
                orderId = row.order_id;
                if (row.article_status == "IN_PROGRESS"){
                    if (row.worker == req.params.workerId){
                        newStatus = "COMPLETE"
                    } else {
                        newStatus = req.params.workerId;
                    }
                } else if ((row.article_status == "1" && req.params.workerId == "2") || (row.article_status == "2" && req.params.workerId == "1")){
                    newStatus = "COMPLETE";
                }
                if (newStatus==400) {return res.status(400).json({"message": "Order_article ID already completed for this worker"});}

                let sql2 = 'UPDATE order_articles SET article_status = (?) WHERE id = (?)';

                db.run(sql2, [newStatus, req.body.id], (err) => {
                    let flag = true;
                    let sql3 = 'SELECT * FROM order_articles WHERE order_id = (?)'
                    db.each(sql3, orderId, (err, row) => {
                        if (row.article_status != "COMPLETE") {
                            flag = false;
                            return;
                        }
                    }, (err, rowCount) => {
                        if (flag){
                            let sql4 = 'UPDATE orders SET status = "COMPLETE" WHERE id = (?)'
                            db.run(sql4, orderId, (err) => {
                                return res.json({"message": "Order Updated and Completed"})
                            })
                        } else {
                            return res.json({"message": "Order Updated"});
                        }
                    })
                });
            });
        })
    });

app.listen(port, () => console.log(`Food Manager listening on port ${port}!`));
//db.close();
