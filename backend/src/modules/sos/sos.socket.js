const SOS = require("../../models/SOS.model");
const User = require("../../models/User.model");

const registerSOSHandlers = (io, socket) => {
  const { _id, role } = socket.data.user;

  // 1. Join personal room
  socket.join(`user:${_id}`);

  // 2. Join security pool if security role
  if (role === "security") {
    socket.join("security:pool");
    
    // Update location if provided in connection query
    const initLocation = socket.handshake.query?.location;
    if (initLocation) {
      try {
        const [lng, lat] = initLocation.split(",").map(Number);
        if (!isNaN(lng) && !isNaN(lat)) {
          User.findByIdAndUpdate(_id, {
            "lastLocation.type": "Point",
            "lastLocation.coordinates": [lng, lat],
            dutyStatus: "available" // Ensure dutyStatus is set on connection
          }).then(() => console.log(`[SOS] Initial location & dutyStatus update for security: ${_id}`));
        }
      } catch (err) {
        console.error("[SOS] Initial location parse error:", err);
      }
    } else {
       // Just ensure dutyStatus is set if not already
       User.findByIdAndUpdate(_id, { dutyStatus: "available" }).exec();
    }
    console.log(`[SOS] Security joined pool: ${_id}`);
  }

  // 3. Handle SOS Location Update (from student)
  socket.on("sos_location_update", async (payload) => {
    try {
      const { sosId, coordinates } = payload; // [lng, lat]
      
      const sos = await SOS.findOne({ _id: sosId, studentId: _id });
      if (!sos) return;

      // Update location history and current coordinates
      sos.locationHistory.push({
        coordinates,
        timestamp: new Date()
      });
      sos.location.coordinates = coordinates;
      await sos.save();

      // Broadcast to room sos:{sosId} so security sees live movement
      io.to(`sos:${sosId}`).emit("sos_location_update", {
        sosId,
        coordinates,
        timestamp: new Date()
      });
    } catch (err) {
      console.error("[SOS] Location update error:", err);
    }
  });

  // 4. Handle Security Location Update (from security)
  socket.on("security_location_update", async (payload) => {
    try {
      const { coordinates } = payload; // [lng, lat]
      
      if (role === "security") {
        await User.findByIdAndUpdate(_id, {
          "lastLocation.type": "Point",
          "lastLocation.coordinates": coordinates
        });
        
        console.log(`[SOS] Updated security location: ${_id}`);
      }
    } catch (err) {
      console.error("[SOS] Security location update error:", err);
    }
  });

  // 5. Join specific rooms (Generic)
  socket.on("join", (room) => {
    socket.join(room);
    console.log(`[SOS] ${socket.data.user._id} joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log(`[SOS] User disconnected: ${_id}`);
  });
};

module.exports = registerSOSHandlers;
