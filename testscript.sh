#!/bin/bash
curl -X PUT -H "Content-Type: application/json" -d '{"amount":2, "articleId":8}' localhost:3000/order/2
curl -X PUT -H "Content-Type: application/json" -d '{"amount":1, "articleId":9}' localhost:3000/order/2
curl -X GET localhost:3000/order/2