import mongoose, { Schema } from "mongoose";


const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },

}, { timestamps: true })



// Ensure a user can like a video only once
likeSchema.index(
    { video: 1, likedBy: 1 },
    { unique: true, partialFilterExpression: { video: { $exists: true } } }
);

likeSchema.index(
    { comment: 1, likedBy: 1 },
    { unique: true, partialFilterExpression: { comment: { $exists: true } } }
);

likeSchema.index(
    { tweet: 1, likedBy: 1 },
    { unique: true, partialFilterExpression: { tweet: { $exists: true } } }
);



export const Like = mongoose.model("Like", likeSchema)




// Note: What happens if multiple users try to like the same video/comment/tweet at the same time?

// ## 🧱 Step-by-step breakdown

// Let’s look at **just one** of them first 👇

// ```js
// likeSchema.index(
//   { video: 1, likedBy: 1 },
//   { unique: true, partialFilterExpression: { video: { $exists: true } } }
// );
// ```

// This means:
// 👉 “For every document where `video` exists, make sure that the **combination** of `video` and `likedBy` is **unique**.”

// ---

// ## 🎯 In plain English

// Think of it like this:

// | video | likedBy | Allowed? | Why                                    |
// | ----- | ------- | -------- | -------------------------------------- |
// | v1    | u1      | ✅        | First like by u1                       |
// | v1    | u2      | ✅        | Different user                         |
// | v2    | u1      | ✅        | Same user but different video          |
// | v1    | u1      | ❌        | Duplicate — same user already liked v1 |

// So:

// * ✅ Many users can like the same video (u1, u2, u3, etc.)
// * ✅ One user can like many different videos
// * ❌ But one user **cannot like the same video twice**

// ---

// ## 🧠 How it works technically

// 1. **`{ video: 1, likedBy: 1 }`** — creates a compound index on both fields.
//    → MongoDB looks at the **pair** of values together (like “v1+u1”).

// 2. **`unique: true`** — ensures that no two documents have the same combination.
//    → So, you can’t have two likes where both `video` and `likedBy` are identical.

// 3. **`partialFilterExpression`** — applies this rule **only** to documents where `video` exists.
//    → That’s because your Like model also has `comment` and `tweet` fields.
//    → This prevents conflicts between likes of different types (video vs comment).

// ---

// ## 🧩 Similarly

// * The next index ensures:

//   ```js
//   { comment: 1, likedBy: 1 }
//   ```

//   ➤ A user can like a **comment only once**

// * The third one:

//   ```js
//   { tweet: 1, likedBy: 1 }
//   ```

//   ➤ A user can like a **tweet only once**

// ---

// ## 🧮 Example in JSON

// Here’s what happens behind the scenes:

// ```json
// [
//   { "video": "v1", "likedBy": "u1" },
//   { "video": "v1", "likedBy": "u2" },
//   { "comment": "c1", "likedBy": "u1" },
//   { "tweet": "t1", "likedBy": "u3" }
// ]
// ```

// ✅ All valid — no duplicates for the same entity-user pair.
// ❌ If another document `{ "video": "v1", "likedBy": "u1" }` is inserted again → MongoDB throws an **E11000 duplicate key error**.

// ---

// ## ⚙️ Why this is important

// Without these indexes:

// * Users could spam likes multiple times.
// * You’d have to manually check before inserting.
// * Aggregation (like counting total likes) becomes inconsistent.

// With indexes:

// * MongoDB automatically enforces the “one like per user per entity” rule.
// * Faster queries for counting likes.
// * Cleaner, more reliable data.

// ---

// ✅ **Summary:**

// * Multiple users can like the same video/comment/tweet — allowed.
// * One user can like multiple videos/comments/tweets — allowed.
// * One user **cannot like the same item twice** — blocked automatically.
