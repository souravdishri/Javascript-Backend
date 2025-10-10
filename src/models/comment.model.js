import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)


commentSchema.plugin(mongooseAggregatePaginate)

// this plugin automatically:
// Adds `$skip` and `$limit` under the hood based on your pagination `options`.
// Returns `total count`, `total pages`, `current page`, `hasNextPage`, etc.
// Prevents you from manually messing up the skip/limit math.


export const Comment = mongoose.model("Comment", commentSchema)



// note: When to use `$skip`/`$limit` vs `mongoose-aggregate-paginate-v2`

// | Situation                                                             | Use `$skip` / `$limit` | Use `aggregatePaginate` |
// | --------------------------------------------------------------------- | ---------------------- | ----------------------- |
// | You want full manual control                                          | ✅ Yes                  | ❌ No                    |
// | You’re already using `mongoose-aggregate-paginate-v2`                 | ❌ No                   | ✅ Yes                   |
// | You just need simple pagination in one place                          | ✅ Yes                  | ❌ No                    |
// | You’ll reuse pagination logic in many places (comments, videos, etc.) | ❌ No                   | ✅ Yes                   |
