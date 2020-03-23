module.exports = {
    getOrder:function(db, orderId) {
        var articles = [];
        return new Promise(function(resolve, reject) {
            console.log("hi")
            sql = 'SELECT * FROM orders LEFT JOIN article ON orders.article_id = article.id WHERE orders.id = (?)'


            db.each(sql, [orderId], function(err, row){
                if (err) {console.log("hiereerrr");reject(err);}
                articles.push({
                    "article_id": row.article_id,
                    "name": row.name,
                //    "amount": row.amount,
                //    "price": row.price
                });

            }, (err, rowCount) => {
                console.log(err)
                resolve(articles);
            });
        })
    }
}
