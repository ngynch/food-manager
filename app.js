const express = require('express');
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
    db.run('CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT)');
    db.run('CREATE TABLE order_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, order_id INTEGER NOT NULL, article_id INTEGER NOT NULL, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (article_id) REFERENCES articles (id))');

    //Speisekarte import
    fs.createReadStream('speisekarte.csv')
    .pipe(csv())
    .on('data', (row) => {
        db.run('INSERT INTO articles(alias, name, price) VALUES(?, ?, ?)',[row.number, row.name, row.price]);
    });
});

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
                    let response = {
                        "id": req.params.orderId,
                        "articles": articles
                    };
                    res.json(response);
                }
            }, (err) => {console.log("Promise failed: "+err+"\n")})

        } else {
            var list_orders = [];
            new Promise((resolve,reject) => {
                let sql = 'SELECT * FROM orders INNER JOIN order_articles ON order_articles.order_id = orders.id INNER JOIN articles ON articles.id = order_articles.article_id';
                db.each(sql, function(err, row) {
                    let flag = false
                    for(item of list_orders){
                        if (item["id"] == row.order_id){
                            flag = true
                            item["articles"].push({
                                "id": row.id,
                                "alias": row.alias,
                                "name": row.name,
                                "amount": row.amount,
                                "price": row.price*row.amount
                            })
                        }
                    }
                    if (!flag) {
                        list_orders.push({
                            "id": row.order_id,
                            "articles": [{
                                            "id": row.id,
                                            "alias": row.alias,
                                            "name": row.name,
                                            "amount": row.amount,
                                            "price": row.price*row.amount
                                        }]
                            })
                    }
                }, (err, rowCount) => {
                    resolve();
                })//simikolon or nah
            })
            .then(() => {
                res.json(list_orders)
            },() => {})
        }
    })
    .post(function (req, res) {
          new Promise(function(resolve, reject) {
              db.run('INSERT INTO orders DEFAULT VALUES', [], function(err) {
                  if (err) {
                      return console.log(err.message);
                  }

                  resolve(this.lastID);
              });
          })
          .then(function(order_id) {
              for (article of req.body.articles) {
                  db.run('INSERT INTO order_articles(amount, order_id, article_id) VALUES(?,?,?)', [article.amount, order_id, article.article_id])
              }
              res.send('Done');
          });

    })
    .put(function (req, res) {//update order
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
                db.run(sql, [req.params.orderId], (err, row) => {
                    if (err){
                        console.log(err)
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
        res.send('Delete order');
    });

app.route('/article/:articleId?')
    .get(function (req, res) {
        if (!isNaN(req.params.articleId)) {
            var article = {}
            new Promise(function(resolve,reject){
                db.each('SELECT * FROM articles WHERE id = (?)',[req.params.articleId], function(err, row){
                    article = {
                        "id" : row.id,
                        "alias" : row.alias,
                        "name" : row.name,
                        "price" : row.price
                    };

                }, (err,rowCount) => {
                    if (rowCount == 0) {res.send("This id does not exist");reject('This id does not exist')};
                    if (err){console.log("failed"+err);reject(err)};
                    resolve();
                });
            })
            .then(() => {
                res.json(article)
            }, (err) => {console.log("Promise failed: "+err);
            });

        } else {
            var articles = []
            new Promise(function(resolve, reject) {
                db.each('SELECT * FROM articles', function(err, row){
                    articles.push({
                        "id": row.id,
                        "alias": row.alias,
                        "name": row.name,
                        "price": row.price
                    })
                },
                        (err, rowCount) => {
                            if (err){console.log("failed"+err);reject(err)}
                            resolve('');

                });
            })
            .then(() => {
                res.json(articles);
            }, () => {console.log("failed");
            });
        };
    })
    .post(function (req, res) {
        res.send('post article\n');
    })
    .put(function (req, res) {
        console.log('Adding new article')
        db.run('INSERT INTO articles VALUES(?,?,?)',[req.body.number, req.body.name, req.body.price])

        var csvWriter = require('csv-write-stream')
        writer = csvWriter({sendHeaders: false})
        writer.pipe(fs.createWriteStream('Speisekarte.csv', {flags: 'a'}))
        writer.write({number:req.body.number, name:req.body.name, price:req.body.price})
        writer.end
        res.send('Added new article to Speisekarte.csv and databank\n');
    })
    .delete(function (req, res) {
        res.send('Deleted article\n');
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
//db.close();
