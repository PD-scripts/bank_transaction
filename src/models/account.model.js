const mongoose = require("mongoose")
const ledgerModel = require("./ledger.model")

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Account must be associated with a user" ],
        index: true//mongodb me index create kr dega user field pe, jisse ki user field pe query krna fast ho jayega, mtlb user field pe search krna fast ho jayega
    //indexiing can be done using b+ trees
    },
    status: {
        type: String,
        enum: {
            values: [ "ACTIVE", "FROZEN", "CLOSED" ],
            message: "Status can be either ACTIVE, FROZEN or CLOSED",
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [ true, "Currency is required for creating an account" ],
        default: "INR"
    }
}, {
    timestamps: true
})

accountSchema.index({ user: 1, status: 1 })
//hume current balance nikalna hai to kaise nikalenge , total credit minus total debit karenge , to vhi kiya hai...

accountSchema.methods.getBalance = async function () {

    const balanceData = await ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "DEBIT" ] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "CREDIT" ] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            //subtract credit - debit to get balance
            $project: {
                _id: 0,
                balance: { $subtract: [ "$totalCredit", "$totalDebit" ] }
            }
        }
    ])
  // if this is the first user or first time it is entering into ledger then balanceData array will be empty, so in that case we will return balance as 0, otherwise we will return the balance from balanceData array
    if (balanceData.length === 0) {
        return 0
    }

    return balanceData[ 0 ].balance

}


const accountModel = mongoose.model("account", accountSchema)



module.exports = accountModel