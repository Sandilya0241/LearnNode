const constants = require("../src/Constants");
const Joi = require("joi");
const fs = require("fs");
const amqp = require("amqplib");
require('dotenv').config();

const schema = Joi.object({
  requestIdentifier: Joi.string()
    .guid({ version: ["uuidv4"] })
    .required(),
});

const processFile = async (file) => {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log(`File processed: ${file.filename}`);
};

exports.handleUpload = async (req, res) => {
  /***
   *
   * Request Validations
   *
   */
  if (!req.body) {
    return res.status(400).json({
      message: constants.ERROR_MESSAGES.ERR_ANS_0003,
    });
  } else {
    const { error } = schema.validate({
      requestIdentifier: req.body.requestIdentifier,
    });
    if (error) {
      return res.status(400).json({
        message: constants.ERROR_MESSAGES.ERR_ANS_0002,
      });
    }
  }
  if (!req.file) {
    return res.status(400).json({
      message: constants.ERROR_MESSAGES.ERR_ANS_0001,
    });
  } else {
    // Validate file presence
    if (req.file.mimetype !== "application/zip") {
      return res.status(400).json({
        message: constants.ERROR_MESSAGES.ERR_ANS_0004,
      });
    }
  }

  /***
   *
   * Post a message on RabbitMQ queue
   *
   */
  try {
    const connection = await amqp.connect(
      `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}`
    );
    const channel = await connection.createChannel();
    const queue = `${process.env.RABBITMQ_QUEUE}`;
    await channel.assertQueue(queue, { durable: true });

    const filePath = `uploads/${req.file.filename}`;
    const message = JSON.stringify({
      filePath,
      filename: req.file.filename,
      requestIdentifier: req.body.requestIdentifier,
    });

    channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
    await channel.close();
    await connection.close();
  } catch (err) {
    console.error("RabbitMQ error:", err);
  }

  /***
   *
   * File received response
   *
   */
  res.status(202).json({
    status: constants.RESP_MESSAGES.FILE_ANS_0001,
    requestIdentifier: req.body.requestIdentifier,
  });

  // Async processing
  await processFile(req.file);

  /***
   *
   * Acknoledgement to external API
   *
   */
  // Notify external API
  await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "FILE_PROCESSED",
      filename: req.file.filename,
    }),
  });

  /***
   *
   * Delete file after processing
   *
   */
  fs.unlink(`uploads/${req.file.filename}`, (err) => {
    if (err) throw err;
    console.log("File deleted");
  });
};
