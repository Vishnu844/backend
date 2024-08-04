const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const moment = require("moment");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const connectToDb = () => {
  try {
    mongoose.connect(process.env.DATABASE);
    console.log("Database is running");
  } catch (err) {
    console.log(err);
  }
};

connectToDb();

const dataSchema = new mongoose.Schema({}, { strict: false });
const Data = mongoose.model("Insight", dataSchema);

app.get("/api/average-intensity-by-topic", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { topic: { $ne: "" }, intensity: { $ne: "" } } },
      {
        $group: {
          _id: "$topic",
          averageIntensity: { $avg: "$intensity" },
        },
      },
      { $sort: { averageIntensity: -1 } },
    ]);

    res.json({
      topics: data.map((item) => item._id),
      intensity: data.map((item) => item.averageIntensity.toFixed(2)),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/most-relevant-insights-by-region", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { region: { $ne: "" }, relevance: { $ne: "" } } },
      {
        $group: {
          _id: "$region",
          totalRelevance: { $sum: "$relevance" },
        },
      },
      { $sort: { totalRelevance: -1 } },
    ]);

    res.json({
      regions: data.map((item) => item._id),
      relevance: data.map((item) => item.totalRelevance.toFixed(2)),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/likelihood-by-country", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { country: { $ne: "" }, likelihood: { $ne: "" } } },
      {
        $group: {
          _id: "$country",
          averageLikelihood: { $avg: "$likelihood" },
        },
      },
      { $sort: { averageLikelihood: -1 } },
    ]);

    res.json({
      countries: data.map((item) => item._id),
      likelihood: data.map((item) => item.averageLikelihood.toFixed(2)),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/intensity-over-years", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { published: { $ne: "" }, intensity: { $ne: "" } } },
      {
        $addFields: {
          publishedYear: {
            $year: {
              $dateFromString: {
                dateString: "$published",
                format: "%B, %d %Y %H:%M:%S",
                timezone: "UTC",
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$publishedYear",
          averageIntensity: { $avg: "$intensity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      years: data.map((item) => item._id),
      intensity: data.map((item) => item.averageIntensity.toFixed(2)),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/insights-count-by-country", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { country: { $ne: "" } } },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      countries: data.map((item) => item._id),
      count: data.map((item) => item.count),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/prevalent-topics-by-region", async (req, res) => {
  try {
    const data = await Data.aggregate([
      {
        $match: {
          topic: { $ne: "" },
          region: { $ne: "" },
        },
      },
      {
        $group: {
          _id: { region: "$region", topic: "$topic" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $group: {
          _id: "$_id.region",
          topics: { $push: { topic: "$_id.topic", count: "$count" } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/most-relevant-topics", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { topic: { $ne: "" }, relevance: { $ne: "" } } },
      {
        $group: {
          _id: "$topic",
          averageRelevance: { $avg: "$relevance" },
        },
      },
      { $sort: { averageRelevance: -1 } },
    ]);

    res.json({
      topics: data.map((item) => item._id),
      relevance: data.map((item) => item.averageRelevance.toFixed(2)),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/distribution-by-pestle", async (req, res) => {
  try {
    const data = await Data.aggregate([
      { $match: { pestle: { $ne: "" } } },
      {
        $group: {
          _id: "$pestle",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      pestle: data.map((item) => item._id),
      count: data.map((item) => item.count),
    });
  } catch (err) {
    res.status({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = {
      $or: [
        { title: new RegExp(search, "i") },
        { insight: new RegExp(search, "i") },
      ],
    };
    const data = await Data.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Data.countDocuments(query);

    res.json({
      status: 1,
      data,
      total,
      page: parseInt(page),
      perPage: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.json({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/get-insights-by-categories", async (req, res) => {
  try {
    const { sector = "", topic = "", country = "", pestle = "" } = req.query;

    const query = {};
    if (sector) {
      query.sector = new RegExp(sector, "i");
    } else if (topic) {
      query.topic = new RegExp(topic, "i");
    } else if (country) {
      query.country = new RegExp(country, "i");
    } else {
      query.pestle = new RegExp(pestle, "i");
    }

    const data = await Data.find(query).limit(10);

    res.json({
      status: 1,
      data,
    });
  } catch (err) {
    res.json({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/get-count", async (req, res) => {
  try {
    const data = await Data.aggregate([
      {
        $facet: {
          insights: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          sectors: [
            {
              $match: {
                $and: [{ sector: { $ne: null } }, { sector: { $ne: "" } }],
              },
            },
            {
              $group: {
                _id: "$sector",
                count: { $sum: 1 },
              },
            },
            {
              $count: "total",
            },
          ],
          topics: [
            {
              $match: {
                $and: [{ topic: { $ne: null } }, { topic: { $ne: "" } }],
              },
            },
            {
              $group: {
                _id: "$topic",
                count: { $sum: 1 },
              },
            },
            {
              $count: "total",
            },
          ],
          published: [
            {
              $match: {
                $and: [
                  { published: { $ne: null } },
                  { published: { $ne: "" } },
                ],
              },
            },
            {
              $group: {
                _id: "$published",
                count: { $sum: 1 },
              },
            },
            {
              $count: "total",
            },
          ],
        },
      },
    ]);
    res.json({
      insightsCount: data[0].insights[0].count,
      topicsCount: data[0].topics[0].total,
      sectorsCount: data[0].sectors[0].total,
      publishedCount: data[0].published[0].total,
    });
  } catch (err) {
    res.json({
      status: 0,
      message: err.message,
    });
  }
});

app.get("/api/insights-with-different-likelihood", async (req, res) => {
  try {
    const data = await Data.aggregate([
      {
        $match: {
          $and: [{ likelihood: { $ne: null } }, { likelihood: { $ne: "" } }],
        },
      },
      { $group: { _id: "$likelihood", totalInsights: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (err) {
    res.json({
      status: 0,
      message: err.message,
    });
  }
});

app.get(
  "/api/top-5-countries-with-highest-number-of-insights",
  async (req, res) => {
    try {
      const data = await Data.aggregate([
        {
          $match: {
            $and: [{ country: { $ne: null } }, { country: { $ne: "" } }],
          },
        },
        { $group: { _id: "$country", totalInsights: { $sum: 1 } } },
        {
          $sort: { totalInsights: -1 },
        },
        {
          $limit: 5,
        },
      ]);
      res.json(data);
    } catch (err) {
      res.json({
        status: 0,
        message: err.message,
      });
    }
  }
);

app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
