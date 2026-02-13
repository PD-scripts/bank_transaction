const accountModel = require("../models/account.model");


async function createAccountController(req, res) {

    const user = req.user;

    //creating new account for the user, account model me user field required hai, isliye user ka id dena padega account create krne ke liye, user ka id req.user me hoga kyuki auth middleware me req.user me user ki information attach kr ke aage badhne dega, to yaha par req.user se user ki information access kr sakte hai aur us user ke liye account create kr sakte hai
    const account = await accountModel.create({
        user: user._id
    })
//account create hone ke baad account ki information response me bhej dena
    res.status(201).json({
        account
    })

}

async function getUserAccountsController(req, res) {

    const accounts = await accountModel.find({ user: req.user._id });

    res.status(200).json({
        accounts
    })
}

async function getAccountBalanceController(req, res) {
    const { accountId } = req.params;

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        })
    }

    const balance = await account.getBalance();

    res.status(200).json({
        accountId: account._id,
        balance: balance
    })
}


module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}