const axios = require('axios');

// Function to get the stops for a specific route based on route ID
const getStopsForRoute = async (routeId) => {
  try {
    // Fetch all trips for the given route
    const tripsResponse = await axios.get(`http://localhost:3010/api/trips`);
    const trips = tripsResponse.data.trips;

    // Filter trips by exact route_id match (no parseInt)
    const routeTrips = trips.filter(trip => trip.route_id === routeId);

    if (routeTrips.length === 0) {
      throw new Error(`No trips found for route_id: ${routeId}`);
    }

    // Pick the first matching trip_id (could improve with better selection logic)
    const tripId = routeTrips[0].trip_id;
    console.log(`Found trip_id: ${tripId} for route_id: ${routeId}`);

    // Fetch stop times for the matched trip_id
    const stopTimesResponse = await axios.get(`http://localhost:3010/api/stop-times/${tripId}`);
    const stopTimes = stopTimesResponse.data.stopTimes;

    if (!stopTimes || stopTimes.length === 0) {
      throw new Error(`No stop times found for trip_id: ${tripId}`);
    }

    // Fetch stop details for each stop_id
    const stops = await Promise.all(
      stopTimes.map(async (stopTime) => {
        const stopResponse = await axios.get(`http://localhost:3010/api/stops/${stopTime.stop_id}`);
        return stopResponse.data.stop;
      })
    );

    return stops;
  } catch (error) {
    console.error(`Error fetching stops for route_id: ${routeId} - ${error.message}`);
    throw new Error('Error fetching stops for route');
  }
};

// Controller to handle the shortest path request for a given route_id
const getShortestPathByRoute = async (req, res) => {
  const routeId = req.params.route_id;

  try {
    const stops = await getStopsForRoute(routeId);

    // Placeholder for shortest path algorithm. Currently returns stops in order.
    res.json({ message: `Shortest path for route_id: ${routeId}`, stops });
  } catch (error) {
    console.error('Error calculating the shortest path:', error);
    res.status(500).json({ message: 'Error calculating the shortest path', error: error.message });
  }
};

module.exports = {
  getShortestPathByRoute,
};
