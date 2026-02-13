const mongoose = require('mongoose');


const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Ledger must be associated with an account" ],
        index: true,
        //immutable: true ka matlab hai ki ledger entry create hone ke baad usme account field ko modify nahi kiya ja sakta, mtlb ledger entry create hone ke baad usme account field ko change nahi kiya ja sakta, isse ye ensure hota hai ki ledger entry create hone ke baad usme account field ko change nahi kiya ja sakta, jisse ki ledger entry ki integrity maintain rahegi
        immutable: true
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required for creating a ledger entry" ],
        immutable: true
    },
    //kis transaction ke liye ye ledger entry create hui hai, mtlb ye ledger entry kis transaction se associated hai, isliye transaction field required hai, aur immutable hai, jisse ki ledger entry create hone ke baad usme transaction field ko modify nahi kiya ja sakta, mtlb ledger entry create hone ke baad usme transaction field ko change nahi kiya ja sakta

    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [ true, "Ledger must be associated with a transaction" ],
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: [ "CREDIT", "DEBIT" ],
            message: "Type can be either CREDIT or DEBIT",
        },
        required: [ true, "Ledger type is required" ],
        immutable: true
    }
})

//jab bhi hum ledger entry ko modify karne ki koshish karenge, chahe wo updateOne, findOneAndUpdate, deleteOne, remove, deleteMany, updateMany, findOneAndDelete ya findOneAndReplace ho, to us case me ledger entry ko modify karne se pehle preventLedgerModification function call hoga, jisme hum error throw karenge ki ledger entries immutable hai aur unhe modify ya delete nahi kiya ja sakta, isse ye ensure hoga ki ledger entries ko modify ya delete nahi kiya ja sakta, jisse ki ledger entries ki integrity maintain rahegi
function preventLedgerModification() {
    throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}

ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('remove', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);


const ledgerModel = mongoose.model('ledger', ledgerSchema);

module.exports = ledgerModel;