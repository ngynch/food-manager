const express = require('express');
const app = express();
const port = 3000;
app.use(express.json());

const sqlite3 =  require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(function() {

    db.run('CREATE TABLE lorem (info TEXT)');
    var stmt = db.prepare('INSERT INTO lorem VALUES (?)');

    for (var i = 0 ; i < 12; i++){
        stmt.run('hi '+ i);
    }

    stmt.finalize();

    db.each('SELECT rowid AS id, info FROM lorem', function(err, row){
        console.log(row.id + ': ' + row.info);
    });

    db.run('CREATE TABLE article (article_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
});

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

app.route('/article/:articleId?')
    .get(function (req, res) {
        if (req.params.articleId == null) {
            db.each('SELECT article_id, name FROM article', function(err, row){
                console.log(row.article_id + ': ' + row.name);
            });
        } else {
            // var stmt = db.prepare('SELECT * FROM article WHERE article_id =?');
            // var element = stmt.get(req.params.articleId);
            // console.log('ID: ' + req.params.articleId + ' Gericht ' + element.name);
        }
        res.send('Get article by Id');
    })
    .post(function (req, res) {
        if (req.body.name != null) {
            db.run('INSERT INTO article(name) VALUES (?)', req.body.name);

            console.log(req.body.name);
            res.send('Create article');
        } else {
            res.status(400).send('Name not defined')
        }

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
//db.close();
