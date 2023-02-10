const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Post must have title"],
  },
  body: {
    type: String,
    required: [true, "Post must have body"],
  },
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
