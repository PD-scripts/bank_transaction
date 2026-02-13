const express = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")


const router = express.Router()

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected Route
 */
//humne route bana liya hai ,bas controller banana hai jo is route me kya kaam krna hai vo bata sake , to jo middle ware se jo req.user me user ki information attach kr ke aage badhne dega, to controller me req.user se user ki information access kr sakte hai, aur us user ke liye account create kr sakte hai
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController)//account controller me createAccountController function ko call karenge jab bhi /api/accounts/ pe POST request aayegi, aur is route ko protected route banayenge authMiddleware ke through, jisse ki sirf authenticated users hi is route ko access kar sake


/**
 * - GET /api/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController)


/**
 * - GET /api/accounts/balance/:accountId
 */
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController)



module.exports = router