const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")


//auth middleware ka kaam hai ki jab bhi koi protected route pe request aati hai to us request ke sath jo token aata hai usko verify krna, agr token valid hai to request ko aage badhne dena aur req.user me user ki information attach kr dena, agr token invalid hai to unauthorized access ka response bhej dena
async function authMiddleware(req, res, next) {

    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]
//agr cookies me token nhi hai to authorization header me token dekhne ki koshish karenge, authorization header me bhi token nhi hai to token variable me undefined aa jayega, mtlb token variable me ya to token ki value aa jayegi ya phir undefined aa jayega
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
// agr tooken milta hai to usko verify krne ki koshish karenge, jwt.verify function token ko verify krta hai, agr token valid hai to decoded variable me token ka payload aa jayega, agr token invalid hai to jwt.verify function error throw kr dega, jisse catch block me catch kr lenge aur unauthorized access ka response bhej denge
    try {
    //what will decoded contain?
    //decoded will contain the same value which was used to create the token, mtlb jwt.sign function me jo payload pass kiya tha, jwt.verify function se token ko verify krne ke baad decoded variable me wahi payload aa jayega, mtlb decoded variable me userId field aa jayega jisme user ka id hoga
       // token ko auth.controller.js me create kiya gaya tha jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" }) isliye jwt.verify function se token ko verify krne ke baad decoded variable me userId field aa jayega jisme user ka id hoga
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await userModel.findById(decoded.userId)

        req.user = user
        //req.user me user ki info attach kr ke aage badhne dena, jisse ki protected route ke controller me req.user se user ki information access kr sake
        return next()

    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
}
async function authSystemUserMiddleware(req, res, next) {

    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await userModel.findById(decoded.userId).select("+systemUser")
        if (!user.systemUser) {
            return res.status(403).json({
                message: "Forbidden access, not a system user"
            })
        }

        req.user = user

        return next()
    }
    catch (err) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
}