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

db.serialize(function() {
    db.run('CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, alias TEXT NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL)');
    db.run('CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, created TEXT NOT NULL, modified TEXT NOT NULL, name TEXT, street TEXT, zipcode TEXT, city TEXT, telephone TEXT)');
    db.run('CREATE TABLE order_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, order_id INTEGER NOT NULL, article_id INTEGER NOT NULL, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (article_id) REFERENCES articles (id))');

    //Speisekarte import
    fs.createReadStream('speisekarte.csv')
    .pipe(csv())
    .on('data', (row) => {
        db.run('INSERT INTO articles(alias, name, price) VALUES(?, ?, ?)',[row.number, row.name, row.price]);
    });
});

app.use(cors())

app.use(function (req, res, next) {
    console.log(`${req.method} ${req.originalUrl} ${Date(Date.now()).slice(0, 24)}`);
    next();
})

app.get('/', function (req, res) {
    res.send('Hello World');
});

app.route('/order/:orderId?')
    .get(function (req, res) {
        if (req.params.orderId!= undefined) {
            orders.getOrder(db,req.params.orderId)
            .then((articles) => {
                if (articles.length == 0) {
                    res.send("OrderID does not exist\n");
                } else {
                    return new Promise((resolve, reject) => {
                        db.get('SELECT * from orders WHERE orders.id = (?)', req.params.orderId, (err, row) => {
                            let response = {
                                    "id": row.id,
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
                            resolve(response);
                        })
                    });
                }
            })
            .then((response) => {
                res.json(response)
            })
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
                res.json(list_orders)
            });
        }
    })
    .post(function (req, res) {
          new Promise((resolve, reject) => {
              let sql = 'INSERT INTO orders(type, created, modified, name, street, zipcode, city, telephone) VALUES(?,?,?,?,?,?,?,?)'
              let time = Date(Date.now()).slice(0, 24)
              db.run(sql, [req.body.type, time, time, req.body.name, req.body.street, req.body.zipcode, req.body.city, req.body.telephone], function(err) {
                  resolve(this.lastID);
              });
          })
          .then((order_id) => {
              for (article of req.body.articles) {
                  db.run('INSERT INTO order_articles(amount, order_id, article_id) VALUES(?,?,?)', [article.amount, order_id, article.id])
              }
              res.send('Order Created\n');
          });

    })
    .put(function (req, res) {
        let sql = 'SELECT * FROM orders WHERE order_id = (?)'
        let flag = false
        new Promise((resolve,reject) => {
            db.run(sql, [req.params.orderId], (err, row) => {
                flag = true
                resolve();
            })
        })
        .then(() => {
            if (!flag){
                res.send('Order ID does not exist yet\n');
                reject();
            } else {
                let sql2 = 'DELETE FROM order_articles WHERE order_id = (?)'
                db.run(sql2, [req.params.orderId], (err, row) => {
                    if (err){
                        console.log("Order could not be deleted: " + err)
                    }
                })
            }
        })
        .then(() => {
            for (article of req.body.articles) {
                db.run('INSERT INTO order_articles(amount, order_id, article_id) VALUES(?,?,?)', [article.amount, req.params.orderId, article.article_id]);
            }
            res.send('Order Updated\n');
        })
    })
    .delete(function (req, res) {
        res.send('Function not implemented\n');
    });

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
                    if (rowCount == 0) {res.send("This id does not exist");reject('This id does not exist')};
                    resolve();
                });
            })
            .then(() => {
                res.json(article)
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
                },
                        (err, rowCount) => {
                            resolve();

                });
            })
            .then(() => {
                res.json(articles);
            });
        };
    })
    .post(function (req, res) {
        res.send('post article\n');
    })
    .put(function (req, res) {
        res.send('Function not implemented\n');
    })
    .delete(function (req, res) {
        res.send('Function not implemented\n');
    });

app.route('/worker')
    .get(function (req, res) {
        res.send('Function not implemented\n');
    })
    .put(function (req, res) {
        res.send('Function not implemented\n');
    });

app.route('/manager')
    .get(function (req, res) {
        res.send('Function not implemented\n');
    })
    .put(function (req, res) {
        res.send('Function not implemented\n');
    });

app.listen(port, () => console.log(`Food Manager listening on port ${port}!`));
//db.close();
