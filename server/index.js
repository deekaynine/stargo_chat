const express = require("express");
const app = express();
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");
const Message = require("./models/Message");

const rooms = ["general", "tech", "finance", "crypto"];
const cors = require("cors");
const { SocketAddress } = require("net");
const { send } = require("process");

//middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//routes
app.use("/users", userRoutes);

//connecting to mongodb
require("./connection");

//http comes by default from nodejs
const server = require("http").createServer(app);

const PORT = process.env.PORT || 5001;

//creating socket server
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.get("/rooms", (req, res) => {
  res.json(rooms);
});

//returning messages grouped by that specific date and room
const getLastMessagesFromRoom = async (room) => {
  //aggregate functions is to query with specific requirements
  let roomMessages = await Message.aggregate([
    { $match: { to: room } },
    { $group: { _id: "$date", messagesByDate: { $push: "$$ROOT" } } },
  ]);
  return roomMessages;
};

const sortRoomMessagesByDate = (messages) => {
  return messages.sort((a, b) => {
    let date1 = a._id.split("/");
    let date2 = b._id.split("/");

    date1 = date1[2] + date1[0] + date1[1];
    date2 = date2[2] + date2[0] + date2[1];

    return date1 < date2 ? -1 : 1;
  });
};

//socket connection
io.on("connect", (socket) => {
  //on emit new-user event from the frontend
  socket.on("new-user", async () => {
    const members = await User.find();
    io.emit("new-user", members);
  });

  //on join-room get messages sorted from the most recent and up
  socket.on("join-room", async (newRoom, previousRoom) => {
    socket.join(newRoom);
    socket.leave(previousRoom);
    let roomMessages = await getLastMessagesFromRoom(newRoom);
    roomMessages = sortRoomMessagesByDate(roomMessages);
    socket.emit("room-messages", roomMessages);
  });

  //when sending messages create message and reupdate the room and emit a notification
  socket.on("message-room", async (room, content, sender, time, date) => {
    const newMessage = await Message.create({
      content,
      from: sender,
      time,
      date,
      to: room,
    });
    let roomMessages = await getLastMessagesFromRoom(room);
    roomMessages = sortRoomMessagesByDate(roomMessages);
    //sending message to room
    io.to(room).emit("room-messages", roomMessages);

    socket.broadcast.emit("notifications", room);
  });

  //logging out user and updating their messages and status
  app.delete("/logout", async (req, res) => {
    try {
      const { _id, newMessages } = req.body;
      const user = await User.findById(_id);
      user.status = "offline";
      user.newMessages = newMessages;
      await user.save();
      const members = await User.find();
      socket.broadcast.emit("new-user", members);
      res.status(200).send();
    } catch (error) {
      console.log(e);
      res.status(400).send();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});
