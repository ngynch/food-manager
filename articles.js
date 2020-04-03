module.exports = {
    getArticleById: function(req, res, db) {
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
                if (rowCount == 0) {reject();}
                resolve();
            });
        })
        .then(() => {
            return res.json(article)
        }, () => {
            return res.status(400).json({"message":"This Article ID does not exist"});
        });
    },

    getArticles: function(res, db) {
        var articles = []

        new Promise((resolve, reject) => {
            db.each('SELECT * FROM articles', (err, row) => {
                articles.push({
                    "id": row.id,
                    "alias": row.alias,
                    "name": row.name,
                    "price": row.price
                })
            }, (err, rowCount) => {
                resolve();
            });
        })
        .then(() => {
            return res.json(articles);
        });
    },

}
