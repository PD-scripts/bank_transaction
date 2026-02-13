const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body
    // age upr kisi se bhi info nhi a rhi hai to iska matlab hai ki client ne request body me se koi required field miss kar di hai, to aise case me bad request ka response bhej dena chahiye, isliye yaha par fromAccount, toAccount, amount aur idempotencyKey ke existence ko validate karenge, agar inme se koi bhi field missing hai to bad request ka response bhej denge
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */
     //idemptency key ka use isliye kiya jata hai taki  same transaction ko baar baar process na kare, isliye jab bhi koi transaction create karne ki request aati hai to sabse pehle hum idempotency key ko validate karenge, mtlb check karenge ki kya is idempotency key ke sath koi transaction already exist karta hai, agar karta hai to us transaction ke status ke hisab se response bhej denge, agar transaction ka status COMPLETED hai to client ko bata denge ki transaction already processed ho chuka hai, agar transaction ka status PENDING hai to client ko bata denge ki transaction abhi processing me hai, agar transaction ka status FAILED hai to client ko bata denge ki transaction processing failed ho chuka hai aur client ko request retry karne ke liye keh denge, agar transaction ka status REVERSED hai to client ko bata denge ki transaction reverse ho chuka hai aur client ko request retry karne ke liye keh denge
     //for example ek shop me meine payment ki but because server was busy , hume pending show ho rha tha , to meine fir se transaction kr diya, to aise case me idempotency key ke through hum ye ensure kr sakte hai ki same transaction ko baar baar process na kiya jaye, aur client ko sahi response mile ki transaction abhi processing me hai ya transaction already processed ho chuka hai, isse client ko bhi pata chalega ki unka transaction kya status me hai, aur unnecessary duplicate transactions bhi create nahi honge
     // abhi hum check kr rhe hai ki ransaction duplicate to nhi hai, idempotency key same to nhi hai
     const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })
     // if transaction already exist karta hai to uske status ke hisab se client ko response bhej dena chahiye, taki client ko pata chale ki unka transaction kya status me hai, aur agar transaction failed ya reversed hai to client ko request retry karne ke liye keh dena chahiye
    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }
// if pending
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }
//if failed
        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */
     //ab hum check karenge ki fromAccount aur toAccount dono hi ACTIVE status me hai ya nahi, agar dono me se koi bhi account ACTIVE status me nahi hai to transaction process nahi karna chahiye, isliye aise case me client ko bad request ka response bhej dena chahiye aur message me bata dena chahiye ki dono accounts ka ACTIVE status me hona zaruri hai transaction process karne ke liye
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    //isme check karenge ki jis account se paise kat rhe hai that is fromaccount, usme sufficient balance hai ya nhi
    const balance = await fromUserAccount.getBalance()
    //getbalance function se fromaccount ka balance mil jayega , ye function accountmodel me defined hai, is function me ledger model ka use karke balance calculate kiya gaya hai, isliye jab bhi hum getbalance function call karenge to ye function ledger model se data fetch karke balance calculate karega aur hume balance return karega, to yaha par hum fromaccount ka balance calculate kar rahe hai taki hume pata chale ki fromaccount me sufficient balance hai ya nahi, agar balance fromaccount ke amount se kam hai to transaction process nahi karna chahiye, isliye aise case me client ko bad request ka response bhej dena chahiye aur message me bata dena chahiye ki insufficient balance hai aur current balance kya hai aur requested amount kya hai
    //if balance of p chaiye then p.getBalance()
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction;
    try {

        /**
         * 5. Create transaction (PENDING)
         */
        //session create krne k liye mongoose m=package ki jarurat padegi therefore usko importkr lena 
        const session = await mongoose.startSession()
        session.startTransaction()

        transaction = (await transactionModel.create([ {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        const debitLedgerEntry = await ledgerModel.create([ {
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })()

        const creditLedgerEntry = await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

    //step sath me hona chaiye therefore session uske baad hi end kr rhe hai..  
          await session.commitTransaction()
        session.endSession()
    } catch (error) {

        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after sometime",
        })

    }
    /**
     * 10. Send email notification
     */
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }


    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([ {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    } ], { session })

    const creditLedgerEntry = await ledgerModel.create([ {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    } ], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}

