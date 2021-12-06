/**
 * List handler for reservation resources
 */

const service = require("./reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const hasProperties = require("../errors/hasProperties");
const dateIsTuesday = require("../errors/dateIsTuesday");
const beforeClosing = require("../errors/beforeClosing");

// pipeline for create function

const VALID_PROPERTIES = [
  "reservation_id",
  "first_name",
  "last_name",
  "mobile_number",
  "reservation_date",
  "reservation_time",
  "people",
  "status",
  "created_at",
  "updated_at",
];

function hasOnlyValidProperties(req, res, next) {
  const { data = {} } = req.body;

  const invalidFields = Object.keys(data).filter(
    (field) => !VALID_PROPERTIES.includes(field)
  );

  if (invalidFields.length)
    return next({
      status: 400,
      message: `Invalid Field(s): ${invalidFields.join(", ")} `,
    });
  return next();
}

const hasRequiredProperties = hasProperties(
  "first_name",
  "last_name",
  "mobile_number",
  "reservation_date",
  "reservation_time",
  "people"
);

const isValid = (req, res, next) => {
  const {
    data: { reservation_date, reservation_time, people, status },
  } = req.body;
  const date = new Date(reservation_date);
  const currentDate = new Date();
  if (typeof people === "string" && people > 0) {
    return next({
      status: 400,
      message: `people: ${people} is not a valid number!`,
    });
  }

  if (reservation_date.match(/[a-z]/i)) {
    return next({
      status: 400,
      message: ` reservation_date: ${reservation_date} is not a date!`,
    });
  }

  if (reservation_time.match(/[a-z]/i)) {
    return next({
      status: 400,
      message: ` reservation_time: ${reservation_time} is not a valid time!`,
    });
  }
  if (
    date.valueOf() < currentDate.valueOf() &&
    date.toUTCString().slice(0, 16) !== currentDate.toUTCString().slice(0, 16)
  )
    return next({
      status: 400,
      message: "Reservations must be made in the future!",
    });

  if (dateIsTuesday(reservation_date)) {
    return next({
      status: 400,
      message: `Sorry closed on Tuesday!`,
    });
  }
  if (beforeClosing(reservation_time)) {
    return next({
      status: 400,
      message: `Sorry We are not open during this time`,
    });
  }
  if (status === "seated" || status === "finished") {
    return next({
      status: 400,
      message: "reservation has already been seated or is already finished",
    });
  }
  next();
};

async function create(req, res) {
  const newReservation = await service.create(req.body.data);

  res.status(201).json({
    data: newReservation[0],
  });
}

async function list(req, res) {
  const date = req.query.date;
  const mobile_number = req.query.mobile_number;
  if (date) {
    res.json({
      data: await service.list(date),
    });
  } else if (mobile_number) {
    res.json({
      data: await service.search(mobile_number),
    });
  }
}

// pipeline for read function

async function reservationExists(req, res, next) {
  const reservation = await service.read(req.params.reservation_id);
  if (reservation) {
    res.locals.reservation = reservation;
    return next();
  }
  next({
    status: 404,
    message: `Reservation ${req.params.reservation_id} cannot be found.`,
  });
}

function read(req, res) {
  res.json({ data: res.locals.reservation });
}

// update function calls create pipeline, plus read pipeline

async function update(req, res) {
  const updatedReservation = { ...req.body.data };
  const data = await service.update(updatedReservation);
  res.json({ data });
}

// pipeline for updateStatus function

const validStatusUpdate = (req, res, next) => {
  const {
    data: { status },
  } = req.body;
  const { reservation } = res.locals;
  if (reservation.status === "finished") {
    return next({
      status: 400,
      message: "a finished reservation cannot be updated",
    });
  }

  if (status === "cancelled") {
    return next();
  }

  if (status !== "booked" && status !== "seated" && status !== "finished")
    return next({ status: 400, message: "Can not update unknown status" });

  next();
};

async function updateStatus(req, res) {
  const updatedReservation = {
    ...res.locals.reservation,
    status: req.body.data.status,
  };
  const data = await service.update(updatedReservation);
  res.json({ data });
}

module.exports = {
  create: [
    hasOnlyValidProperties,
    hasRequiredProperties,
    isValid,
    asyncErrorBoundary(create),
  ],
  list: asyncErrorBoundary(list),
  read: [asyncErrorBoundary(reservationExists), read],
  update: [
    asyncErrorBoundary(reservationExists),
    hasOnlyValidProperties,
    hasRequiredProperties,
    isValid,
    asyncErrorBoundary(update),
  ],
  updateStatus: [
    asyncErrorBoundary(reservationExists),
    validStatusUpdate,
    asyncErrorBoundary(updateStatus),
  ],
};

// // teddy check below ------>
// const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
// const service = require("./reservations.service");
// const hasProperties = require("../errors/hasProperties");
// const dateIsTuesday = require("../errors/dateIsTuesday");
// const beforeClosing = require("../errors/beforeClosing");

// /**
//  * List handler for reservation resources
//  */
// const VALID_PROPERTIES = [
//   "reservation_id",
//   "first_name",
//   "last_name",
//   "mobile_number",
//   "reservation_date",
//   "reservation_time",
//   "people",
//   "status",
//   "created_at",
//   "updated_at",
// ];

// function hasOnlyValidProperties(req, res, next) {
//   const { data = {} } = req.body;

//   const invalidFields = Object.keys(data).filter(
//     (field) => !VALID_PROPERTIES.includes(field)
//   );

//   if (invalidFields.length)
//     return next({
//       status: 400,
//       message: `Invalid Field(s): ${invalidFields.join(", ")} `,
//     });
//   next();
// }

// const hasRequiredProperties = hasProperties(
//   "first_name",
//   "last_name",
//   "mobile_number",
//   "reservation_date",
//   "reservation_time",
//   "people"
// );

// const isValid = (req, res, next) => {
//   const {
//     data: { reservation_date, reservation_time, people, status },
//   } = req.body;
//   const date = new Date(reservation_date);
//   const currentDate = new Date();
//   if (typeof people === "string" && people > 0) {
//     return next({
//       status: 400,
//       message: `people: ${people} is not a valid number!`,
//     });
//   }

//   if (reservation_date.match(/[a-z]/i)) {
//     return next({
//       status: 400,
//       message: ` reservation_date: ${reservation_date} is not a date!`,
//     });
//   }

//   if (reservation_time.match(/[a-z]/i)) {
//     return next({
//       status: 400,
//       message: ` reservation_time: ${reservation_time} is not a valid time!`,
//     });
//   }
//   if (
//     date.valueOf() < currentDate.valueOf() &&
//     date.toUTCString().slice(0, 16) !== currentDate.toUTCString().slice(0, 16)
//   )
//     return next({
//       status: 400,
//       message: "Reservations must be made in the future!",
//     });

//   if (dateIsTuesday(reservation_date)) {
//     return next({
//       status: 400,
//       message: `Sorry closed on Tuesday!`,
//     });
//   }
//   if (beforeClosing(reservation_time)) {
//     return next({
//       status: 400,
//       message: `Sorry We are not open during this time`,
//     });
//   }
//   if (status === "seated" || status === "finished") {
//     return next({
//       status: 400,
//       message: "reservation has already been seated or is already finished",
//     });
//   }
//   next();
// };

// async function reservationExists(req, res, next) {
//   const { reservationId } = req.params;
//   const error = {
//     status: 404,
//     message: `Reservation ${reservationId} cannot be found`,
//   };

//   if (!reservationId) return next(error);

//   const reservation = await service.read(reservationId);

//   if (!reservation) return next(error);
//   res.locals.reservation = reservation;
//   next();
// }

// const validStatusUpdate = (req, res, next) => {
//   const {
//     data: { status },
//   } = req.body;
//   const { reservation } = res.locals;
//   if (reservation.status === "finished") {
//     return next({
//       status: 400,
//       message: "a finished reservation cannot be updated",
//     });
//   }

//   if (status === "cancelled") {
//     return next();
//   }

//   if (status !== "booked" && status !== "seated" && status !== "finished")
//     return next({ status: 400, message: "Can not update unknown status" });

//   next();
// };

// async function list(req, res, next) {
//   const { date, mobile_number } = req.query;

//   if (mobile_number) {
//     const reservationByNum = await service.listByMobileNum(mobile_number);
//     res.status(200).json({ data: reservationByNum });
//   }
//   const reservation = await service.list(date);
//   res.status(200).json({ data: reservation });
// }

// async function create(req, res) {
//   const newReservation = await service.create(req.body.data);
//   res.status(201).json({ data: newReservation });
// }

// async function read(req, res) {
//   const { reservation } = res.locals;
//   res.json({ data: reservation });
// }

// async function update(req, res) {
//   const { reservationId } = req.params;

//   const data = await service.update(reservationId, req.body.data);

//   res.status(200).json({ data: data[0] });
// }

// async function updateStatus(req, res) {
//   const {
//     data: { status },
//   } = req.body;

//   const { reservationId } = req.params;
//   const updatedStatus = await service.updateStatus(reservationId, status);

//   res.status(200).json({ data: { status: updatedStatus[0] } });
// }

// module.exports = {
//   list: [asyncErrorBoundary(list)],
//   create: [
//     hasOnlyValidProperties,
//     hasRequiredProperties,
//     isValid,
//     asyncErrorBoundary(create),
//   ],
//   read: [asyncErrorBoundary(reservationExists), asyncErrorBoundary(read)],
//   update: [
//     asyncErrorBoundary(reservationExists),
//     hasOnlyValidProperties,
//     hasRequiredProperties,
//     isValid,
//     asyncErrorBoundary(update),
//   ],
//   updateStatus: [
//     asyncErrorBoundary(reservationExists),
//     asyncErrorBoundary(validStatusUpdate),
//     asyncErrorBoundary(updateStatus),
//   ],
// };
