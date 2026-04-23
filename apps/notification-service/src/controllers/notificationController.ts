import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { Server } from "socket.io";
import { sendEmail } from "../utils/email";

export const createEventEmitter = (io: Server) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { event, data } = req.body;
      if (!event) throw new AppError("event is required", 400);

      // Emit to WebSockets (Mandatory)
      io.emit(event, data || {});

      // Handle specific email notification logic
      if (event === "screening_finished" && data.sendEmail && data.recruiterEmail) {
        const statsStr = data.stats 
          ? `<br/>Applicants: ${data.stats.totalApplicants}<br/>Shortlisted: ${data.stats.shortlistedCount}` 
          : "";
        
        await sendEmail(
          data.recruiterEmail,
          `Screening Completed: ${data.jobName}`,
          `<h3>Your AI screening for <b>${data.jobName}</b> has finished.</h3>
           <p>Total processed results are now available in your dashboard.</p>
           ${statsStr}
           <br/>
           <p>Best regards,<br/>UmuravaLens Team</p>`
        );
      }

      res.json(ok({ emitted: true, event }));
    } catch (error) {
      next(error);
    }
  };
};

