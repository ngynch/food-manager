module.exports = {
    getOrderArticlesById:function(req, db) {
        var articles = [];

        return new Promise((resolve, reject) => {
            sql = 'SELECT *,articles.name as name,order_articles.id as id FROM order_articles INNER JOIN articles ON order_articles.article_id = articles.id LEFT JOIN orders ON orders.id = order_articles.order_id WHERE order_articles.order_id = (?)'

            db.each(sql, req.params.orderId, (err, row) => {
                articles.push({
                    "id": row.id,
                    "status": row.article_status,
                    "alias": row.alias,
                    "name": row.name,
                    "amount": row.amount,
                    "price": row.price*row.amount
                });

            }, (err, rowCount) => {
                resolve(articles);
            });
            })
    },
    getOrderDetails:function(req, db){
        return new Promise((resolve, reject) => {
            db.get('SELECT * from orders WHERE orders.id = (?)', req.params.orderId, (err, row) => {
                let details = {
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
                    };
                return resolve(details);
            });
        })
    },

    getOrders:function(db) {
        var list_orders = [];

        return new Promise((resolve,reject) => {
            let sql = 'SELECT *,orders.name as ordername,articles.name as articlename FROM orders ';
            sql +=  'INNER JOIN order_articles ON order_articles.order_id = orders.id ';
            sql += 'INNER JOIN articles ON articles.id = order_articles.article_id';

            db.each(sql, (err, row) => {
                let flag = false;
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
                resolve(list_orders);
            })
        })
    },

    createOrder:function(req, db) {
        return new Promise((resolve, reject) => {

            let sql = 'INSERT INTO orders(type, created, modified, name, street, zipcode, city, telephone, status) VALUES(?,?,?,?,?,?,?,?,?)'
            let time = Date.now();

            db.run(sql, [req.body.type, time, time, req.body.name, req.body.street, req.body.zipcode, req.body.city, req.body.telephone, "IN_PROGRESS"], function(err) {
                resolve(this.lastID);
            });
        })
        .then((order_id) => {
            return new Promise((resolve, reject) => {
                for (article of req.body.articles) {
                    db.run('INSERT INTO order_articles(amount, order_id, article_id, article_status) VALUES(?,?,?,?)', [article.amount, order_id, article.id, "TO_DO"], (err) => {
                        if (err) {reject();}
                        resolve();
                    });
                }
            })
        })
    },

    orderExist:function(req, db) {
        let sql = 'SELECT * FROM orders WHERE id = (?)';
        let flag = false;

        return new Promise((resolve,reject) => {
            db.get(sql, [req.params.orderId], (err, row) => {
                flag = row != undefined ? resolve() : reject();
            })
        });
    },

    updateOrder:function(req, db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                let sql2 = 'UPDATE orders SET status = (?), modified = (?) WHERE id = (?)';
                db.run(sql2,[req.body.status, Date.now(), req.params.orderId]);

                let sql3 = 'DELETE FROM order_articles WHERE order_id = (?)';
                db.run(sql3, req.params.orderId);

                for (article of req.body.articles) {
                    let sql4 = 'INSERT INTO order_articles(amount, order_id, article_id, article_status) VALUES(?,?,?,?)';
                    db.run(sql4, [article.amount, req.params.orderId, article.id, req.body.status],(err) => {
                        if (err) {reject();}
                        resolve();
                    });
                }
            })
        })
    }
}
