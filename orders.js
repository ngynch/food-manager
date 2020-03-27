module.exports = {
    getOrder:function(db, orderId) {
        var articles = [];
        return new Promise(function(resolve, reject) {
            sql = 'SELECT * FROM order_articles INNER JOIN articles ON order_articles.article_id = articles.id LEFT JOIN orders ON orders.id = order_articles.order_id WHERE order_articles.order_id = (?)'

            db.each(sql, [orderId], function(err, row){
                if (err) {console.log("hiereerrr");reject(err);}
                articles.push({
                    "id": row.article_id,
                    "alias": row.alias,
                    "name": row.name,
                    "amount": row.amount,
                    "price": row.price*row.amount
                });

            }, (err, rowCount) => {
                resolve(articles)
            });
        })
    }
}
