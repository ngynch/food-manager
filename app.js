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
    db.run('CREATE TABLE article (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)');
    db.run('CREATE TABLE orders (id INTEGER NOT NULL, amount INTEGER NOT NULL, article_id TEXT NOT NULL, FOREIGN KEY (article_id) REFERENCES article (id))');

    //Speisekarte import
    fs.createReadStream('speisekarte.csv')
    .pipe(csv())
    .on('data', (row) => {
        db.run('INSERT INTO article VALUES(?,?,?)',[row.number, row.name, row.price]);
    });
});

app.get('/', function (req, res) {
    res.send('Hello World');
});

app.route('/order/:orderId?')
    .get(function (req, res) {
        var articles = [];
        if (req.params.orderId!= undefined) {
            test = orders.getOrder(db,req.params.orderId)
            console.log("fehler behebung")
            console.log(test)
            res.json(test)

        } else {
            console.log('Alle Bestellungen');
            //print ordered orders
        }
    })
    .post(function (req, res) {//not neccessary
        res.send('Not Neccessary');
    })
    .put(function (req, res) {//input id, amount, article
        db.run('INSERT INTO orders VALUES(?,?,?)',[req.params.orderId, req.body.amount, req.body.articleId]);
        res.send('Order Updated\n');
    })
    .delete(function (req, res) {
        res.send('Delete order');
    });

app.route('/article/:articleId?')
    .get(function (req, res) {
        if (!isNaN(req.params.articleId)) {
            var article = {}
            new Promise(function(resolve,reject){
                db.each('SELECT * FROM article WHERE id = (?)',[req.params.articleId],function(err,row){
                    article = {
                        "id" : row.id,
                        "name" : row.name,
                        "price" : row.price
                    };

                }, (err,rowCount) => {
                    if (rowCount == 0) {res.send("This id does not exist");reject('This id does not exist')};
                    if (err){console.log("failed"+err);reject(err)};
                    resolve('');
                });
            })
            .then(() => {
                res.json(article)
            }, (err) => {console.log("Promise failed: "+err);
            });

        } else {
            var articles = []
            new Promise(function(resolve, reject) {
                db.each('SELECT * FROM article', function(err, row){
                    articles.push({
                        "id": row.id,
                        "name": row.name,
                        "price": row.price
                    })},
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
        db.run('INSERT INTO article VALUES(?,?,?)',[req.body.number, req.body.name, req.body.price])

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
