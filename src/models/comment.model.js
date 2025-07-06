import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content : {
            type : String,
            require :true
        },

        video : {
            type : String,
            require : true
        },

        onwer : {
            type : String,
            require : true
        }
    },
    {
        timestamps : true
    }
)

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)