module.exports = {
    getArticleById: function(req, db) {
        var article = {}

        return new Promise((resolve,reject) => {
            db.each('SELECT * FROM articles WHERE id = (?)',req.params.articleId, (err, row) => {
                article = {
                    "id" : row.id,
                    "alias" : row.alias,
                    "name" : row.name,
                    "price" : row.price
                };
            }, (err,rowCount) => {
                if (rowCount == 0) {reject();}
                resolve(article);
            });
        })
    },

    getArticles: function(db) {
        let articles = []

        return new Promise((resolve, reject) => {
            db.each('SELECT * FROM articles', (err, row) => {
                articles.push({
                    "id": row.id,
                    "alias": row.alias,
                    "name": row.name,
                    "price": row.price
                })
            }, (err, rowCount) => {
                resolve(articles);
            });
        })

    },

}
