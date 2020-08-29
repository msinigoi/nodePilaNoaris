const express = require("express");
const app = express();
const http = require("http");
const monk = require("monk");

if (process.env.NODE_ENV != "produtcion") {
  require("dotenv").config();
}

const db = monk(process.env.MONGODB_URI);
const ppl = db.get("ppl");

const hostname = "127.0.0.1";
const port = process.env.PORT || 3001;

app.get("/ok/:name", async (request, response) => {
  const name = request.params["name"];
  try {
    const maxorderPerson = await ppl.findOne({}, { sort: { order: -1 } });
    const maxorder = maxorderPerson["order"];
    ppl.find({}).then(async (result) => {
      for (var i in result) {
        if (result[i]["name"] === name) {
          updatePerson(result[i]["name"], maxorder);
        } else {
          updatePerson(result[i]["name"], result[i]["order"] - 1);
        }
      }
    });
    return response.status(200).send("ok done");
  } catch (error) {
    response.status(500).send(error);
  }
});

function updatePerson(name, order) {
  try {
    ppl.update({ name: name }, { $set: { order: order } });
  } catch (error) {
    response.status(500).send(error);
  }
}

app.get("/printAll", function (req, res) {
  ppl.find({}).then(function (result) {
    try {
      res.status(200).send("result is: " + JSON.stringify(result));
    } catch (error) {
      res.status(404).send(error);
    }
  });
});

app.get("/add/:name", async (request, response) => {
  const name = request.params["name"];
  try {
    const exist = await ppl.findOne({ name: name });
    if (exist) {
      return response.status(200).send("Name already added");
    } else {
      const maxorder = await ppl.findOne({}, { sort: { order: -1 } });
      var personToAdd = {
        name: name,
        order: maxorder["order"] + 1,
        notdoingorder: null,
      };
      ppl.insert(personToAdd);
      return response
        .status(200)
        .send("ok with order: " + (maxorder["order"] + 1));
    }
  } catch (error) {
    return response.status(500).send(error);
  }
});

app.get("/delete/:name", async (request, response) => {
  const name = request.params["name"];
  try {
    const personToDelete = await ppl.findOne({ name: name });
    if (personToDelete) {
      const order = personToDelete["order"];
      ppl.remove({ name: name });
      ppl.find({ order: { $gt: order } }).then(async (result) => {
        for (var i in result) {
          updatePerson(result[i]["name"], result[i]["order"] - 1);
        }
      });
    } else {
      return response.status(404).send(name + " not found");
    }
  } catch (error) {
    return response.status(500).send(error);
  }
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
