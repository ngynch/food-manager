module.exports = {
    getWorkerById:  function(req, res, db) {
        let articles = [];
        let sql = 'SELECT *,articles.id as id,articles.name as name FROM order_articles ';
        sql += 'INNER JOIN articles ON order_articles.article_id = articles.id ';
        sql += 'INNER JOIN orders ON orders.id = order_articles.order_id ';
        sql += 'WHERE (order_articles.article_status = "IN_PROGRESS" OR order_articles.article_status = (?)) ';
        sql += 'AND (articles.worker = (?) OR articles.worker = "12")'
        let workerArticles = [];

        new Promise((resolve, reject) => {
            db.each(sql,[-req.params.workerId+3, req.params.workerId], (err, row) => {
                let index = workerArticles.findIndex(x => x["id"] == row.id);
                console.log(index)
                if (index != -1) {
                    workerArticles[index]["amount"] += row.amount;
                } else {
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
                }
            }, (err, rowCount) => {
                resolve(workerArticles);
            })
        })
        .then((result) => {
            return res.json(result)
        });
    },

    updateWorkerById: function(req, res, db) {
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
    }
}
