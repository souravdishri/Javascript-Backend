import mongoose, { Schema } from "mongoose";
//Helps in write mongoose aggregate queries
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            url: {             // Cloudinary image URL
                type: String,
                required: true
            },
            public_id: {       // Cloudinary public_id for deletion
                type: String,
                required: true
            }
        },
        thumbnail: {
            url: {             // Cloudinary image URL
                type: String,
                required: true
            },
            public_id: {       // Cloudinary public_id for deletion
                type: String,
                required: true
            }
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {             //we get from cloudinary
            type: Number,
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
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

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)