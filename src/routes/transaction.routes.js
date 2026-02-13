const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');//hum usi middleware ka use krr rhe hai jo auth.routes.js me use kiya tha, jisse ki hum protected route bana sake, jisse ki sirf authenticated users hi is route ko access kar sake . is middleware me req.user se user ki info mil rhi thi, to yaha par bhi authMiddleware ka use karenge jisse ki req.user me user ki information attach kr ke aage badhne dega, aur controller me req.user se user ki information access kr sakte hai
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)


/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction)

module.exports = transactionRoutes;