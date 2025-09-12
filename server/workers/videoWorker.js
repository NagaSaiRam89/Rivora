const { Worker } = require('bullmq')
const { processSession } = require('../merge/merge')
const Session = require('../models/Session')
const { videoQueue } = require('../queues/videoQueue')
const { transporter } = require('../controllers/sessionController')
const mongoose = require('mongoose');

require('dotenv').config()

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Worker connected to MongoDB');
  }
}

connectDB().catch(err => console.error('MongoDB connection error in worker:', err));

const worker = new Worker(
  'video-processing',
  async (job) => {
    console.log(`Starting job ${job.id} with data:`, job.data)

    const { sessionId } = job.data

    // Process the session videos
    console.log(`Processing session ${sessionId}...`)
    const { hostUrl, guestUrl, mergedUrl } = await processSession(sessionId)
    console.log('Video processing complete:', { hostUrl, guestUrl, mergedUrl })

    // Update session in DB
    const session = await Session.findOneAndUpdate(
      { _id: sessionId },
      {
        $set: {
          'mergedVideo.host': hostUrl,
          'mergedVideo.guest': guestUrl,
          'mergedVideo.finalMerged': mergedUrl,
          isLive: false,
        },
      },
      { new: true }
    )
    .populate('host')
    

    if (!session) {
      console.error(`Session ${sessionId} not found!`)
      throw new Error('Session not found.')
    }

    console.log('Session updated successfully:', session._id)

    const sessionLink = `${process.env.FRONTEND_URL}/my-studios/${sessionId}`

    // Fetch host user
    const user = session.host;
    if (!user) {
      console.error(`Host user not found for session ${sessionId}`)
      throw new Error('Host user not found.')
    }
    console.log('Host user found:', user.email)

    const hostName = (session && session.host && session.host.name) || 'Host'
    console.log(`Sending email to ${hostName} at ${user.email}...`)

    await transporter.sendMail({
      from: `Rivora - ${process.env.SMTP_USER}`,
      to: user.email,
      subject: 'Your podcast session is ready to download!',
      html: `
        <div style="font-family: 'Inter', sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
          <p style="font-size: 16px; margin-bottom: 15px;">Hi <strong style="color: #333333;">${hostName}</strong>,</p>
          <p style="font-size: 16px; margin-bottom: 15px;">Your studio session videos have been successfully merged and are ready for download!</p>
          <p style="font-size: 16px; margin-bottom: 25px;">You can access and download your merged videos from the session details page:</p>
          <p style="text-align: center; margin-bottom: 25px;">
            <a href="${sessionLink}" style="display: inline-block; padding: 12px 25px; background-color: #8A65FD; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; transition: background-color 0.3s ease;" target="_blank">
              View & Download Videos
            </a>
          </p>
          <p style="font-size: 14px; color: #666666; text-align: center; margin-top: 30px;">Thank you for using Rivora Studio!</p>
          <p style="font-size: 12px; color: #999999; text-align: center; margin-top: 20px;">&copy; 2025 Rivora. All rights reserved.</p>
        </div>
      `,
    })
    console.log('Email sent successfully.')

    return { hostUrl, guestUrl, mergedUrl }
  },
  {
    connection: videoQueue.opts.connection,
    pollInterval: 5000,
    stalledInterval: 30000,
    enableEvents: false,
    limiter: {
      max: 5, // max 5 jobs
      duration: 1000, // per 1 second
    },
  }
)

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed!`);
  console.error('Error message:', err.message);
})