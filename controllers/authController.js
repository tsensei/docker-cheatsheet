const bcrypt = require("bcrypt");
const User = require("../models/userModel");

const signUp = async (req, res) => {
  const { username, password } = req.body;
  console.log(`called`);
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "failed",
    });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "user not found",
      });
    }

    const isCorrect = await bcrypt.compare(password, user.password);

    if (isCorrect) {
      res.status(200).json({
        status: "success",
      });
    } else {
      res.status(400).json({
        status: "failed",
        message: "incorrect username or password",
      });
    }
  } catch (error) {
    res.status(400).json({
      status: "failed",
    });
  }
};

module.exports = {
  signUp,
  login,
};
