module.exports = {
    getWorkerById:  function(req, db) {
        let articles = [];
        let sql = 'SELECT *,order_articles.id as id,articles.name as name FROM order_articles ';
        sql += 'INNER JOIN articles ON order_articles.article_id = articles.id ';
        sql += 'INNER JOIN orders ON orders.id = order_articles.order_id ';
        sql += 'WHERE (order_articles.article_status = "IN_PROGRESS" OR order_articles.article_status = (?)) ';
        sql += 'AND (articles.worker = (?) OR articles.worker = "12")'
        let workerArticles = [];

        return new Promise((resolve, reject) => {
            db.each(sql,[-req.params.workerId+3, req.params.workerId], (err, row) => {
                /*let index = workerArticles.findIndex(x => x["id"] == row.id);
                if (index != -1) {
                    workerArticles[index]["amount"] += row.amount;
                } else {*/
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
                resolve(workerArticles);
            })
        })
    },

    updateWorkerById: function(req, db) {
        let sql1 = 'SELECT * FROM order_articles INNER JOIN articles ON order_articles.article_id = articles.id ';
        sql1 += 'WHERE (order_articles.id = (?)) AND (articles.worker = (?) OR articles.worker = "12")';
        let sql2 = 'UPDATE order_articles SET article_status = (?) WHERE id = (?)';
        let sql3 = 'SELECT * FROM order_articles WHERE order_id = (?)'
        let sql4 = 'UPDATE orders SET status = "COMPLETE" WHERE id = (?)'
        let orderId;

        return new Promise((resolve, reject) => {
            db.get(sql1, [req.body.id,req.params.workerId], (err, row) => {
                if (row == undefined) {
                    return reject({"message": "Order_article ID not found for this worker"});
                }
                orderId = row.order_id;
                if (row.article_status == "IN_PROGRESS"){
                    if (row.worker == req.params.workerId){
                        resolve("COMPLETE");
                    } else {
                        resolve(req.params.workerId);
                    }
                } else if ((row.article_status == "1" && req.params.workerId == "2") || (row.article_status == "2" && req.params.workerId == "1")){
                    resolve("COMPLETE");
                } else {
                    reject({"message":"Worker already completed this article. Status: " + row.article_status});
                }
            })
        })
        .then((newStatus) => {
            return new Promise((resolve, reject) => {
                db.run(sql2, [newStatus, req.body.id], (err) => {
                    if (err) {return reject(err);}
                    resolve();
                });
            })
        }, (err) => {
            return new Promise((resolve, reject) => {
                reject(err);
            });
        })
        .then(() => {// check if order finished
            return new Promise((resolve, reject) => {
                let flag = true;
                db.each(sql3, orderId, (err, row) => {
                    if (row.article_status != "COMPLETE") {
                        flag = false;
                    }
                }, (err, rowCount) => {
                    if (flag){
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            });
        }, (err) => {
            return new Promise((resolve, reject) => {
                reject(err);
            });
        })
        .then((flag) => {
            return new Promise((resolve, reject) => {
                if (!flag) { return resolve({"message": "Order Updated"});}
                db.run(sql4, orderId, (err) => {
                    resolve({"message": "Order Updated and Completed"})
                });
            })
        }, (err) => {
        return new Promise((resolve, reject) => {
            reject(err);
        });
        });
    }
}
