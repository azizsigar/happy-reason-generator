import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AvatarGenerator } from "random-avatar-generator";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
export const profile = async (req, res) => {
  try {
    // Get the user ID from the request
    const userId = req.userId;
    // Find the user in the database
    const user = await User.findById(userId);
    // Respond with the user data
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getRandomAvatar = async () => {
  try {
    const response = await axios.get(
      "https://xsgames.co/randomusers/avatar.php?g=pixel"
    );
    return response.data; // Assuming the response is the URL as plain text
  } catch (error) {
    console.error("Error fetching avatar:", error);
    return null; // Return null or a default avatar URL if fetching fails
  }
};
export const addUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if the user already exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // Validate password criteria
    if (password.length < 8) {
      return res.status(400).json({ message: "Password is too short" });
    }
    if (name.length < 8) {
      return res.status(400).json({ message: "Name is too short" });
    }
    if (!password.match(/[0-9]/)) {
      return res
        .status(400)
        .json({ message: "Password must include a number" });
    }
    if (!password.match(/[a-zA-Z]/)) {
      return res
        .status(400)
        .json({ message: "Password must include a letter" });
    }
    if (!password.match(/[!@#$%^&*]/)) {
      return res
        .status(400)
        .json({ message: "Password must include a special character" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const generator = new AvatarGenerator();
    const avatarUrl = generator.generateRandomAvatar();

    // Create the new user (MongoDB automatically generates _id)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: avatarUrl, // Save the avatar URL with the user
    });

    // Save the user to the database
    await newUser.save();

    // Respond with success
    res.status(201).json({ message: "User added" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Create a JWT token with necessary information
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,

      { expiresIn: "1h" }
    );
    const seller = await User.findOne({ email: user.email });
    console.log("users email is: ", seller.email);
    // Return the token to the client
    res.status(200).json({ user, token });
  } catch (error) {
    console.error("Login Error:", error.message); // Debugging statement
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
