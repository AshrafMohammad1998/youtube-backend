import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema({
    username : {
        type: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true,
        index: true
    },
    email : {
        type: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true,
    },
    fullName : {
        type: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true,
        index: true
    }, 
    avatar : {
        type: String, // cloudinary url
        required: true,
    }, 
    coverImage : {
        type: String, // cloudinary url
    }, 
    password : {
        type: String, // cloudinary url
        required: [true, "Password is required"],
    }, 
    watchingHistory : [
        {
            type: Schema.Types.ObjectId,
            ref : "video"
        }
    ],
    refreshTokens:{
        type: String 
    }
    
}, {timestamps:true})

userSchema.pre("Save", async function(next){
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.method.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.model.generateAccessToken = function(){
    return  jwt.sign(
      {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
      },
      process.env.ACCESS_TOKEN_SECRET, 
      {
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    )
}

userSchema.model.generateRefreshToken = function(){
    return jwt.sign(
      {
        _id: this._id,
        
      },
      process.env.REFRESH_TOKEN_SECRET, 
      {
        expiresIn: REFRESH_TOKEN_EXPIRY
      }
    )
}
export const User = mongoose.model("User", userSchema)