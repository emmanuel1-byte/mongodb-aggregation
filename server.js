const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const { createServer } = require("http");

app.use(express.json());

const server = createServer(app);

app.get("/", (req, res, next) => {
  res.status(200).json({ message: "Server is Active" });
});

/**
 * This is a sample workflow demonstrating how MongoDB aggregation works to group revenue
 * from transaction records by daily, weekly, and monthly intervals.
 */
app.get("/aggregation", async (req, res, next) => {
  try {
    const analytics = await mongoose.connection
      .collection("transactions")
      .aggregate([
        {
          $project: {
            amount: 1,
            createdAt: 1,
            daily: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            weekly: {
              $isoWeek: "$createdAt",
            },
            monthly: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            year: { $year: "$createdAt" },
          },
        },
        {
          $group: {
            _id: {
              daily: "$daily",
              weekly: { year: "$year", week: "$weekly" },
              monthly: "$monthly",
            },
            dailyRevenue: { $sum: "$amount" },
            weeklyRevenue: { $sum: "$amount" },
            monthlyRevenue: { $sum: "$amount" },
          },
        },
        {
          $sort: {
            "_id.daily": 1,
            "_id.weekly.year": 1,
            "_id.weekly.week": 1,
            "_id.monthly": 1,
          },
        },
      ])
      .toArray();

    res.status(200).json({ data: { analytics } });
  } catch (err) {
    next(err);
  }
});

app.use("*", (req, res) => {
  res
    .status(404)
    .json({ message: "Requested endpoint does not exist on this server" });
});

app.use((err, req, res, next) => {
  console.error(`${err.message}\n${err.stack}`);
  res.status(500).json({
    message: "Internal Server Error",
  });
});

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("Database connection successfull");
  } catch (err) {
    throw new Error(`Failed to connect to Db: ${err}`);
  }
}
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  await connectDatabase();
});
