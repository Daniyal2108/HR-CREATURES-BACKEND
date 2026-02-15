const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend('re_iEkzwDEW_DTDLERQkdsjzfPiY9FQcKNWv');

module.exports = class Email {
  constructor(user, url, emailFrom) {
    this.to = user.email;
    // this.firstName = user.name.split(' ')[0];
    this.firstName = user?.userName || user?.firstName;
    this.url = url;
    this.from =
      emailFrom == 'support'
        ? `Hr Management <${process.env.EMAIL_FROM_SUPPORT}>`
        : `Hr Management <${process.env.EMAIL_FROM}>`;
  }

  // newTransport() {

  //   // Gmail
  //   return nodemailer.createTransport({
  //     host: "smtp.gmail.com",
  //     service: "gmail",
  //     port:'2525',
  //     auth: {
  //       user: `${process.env.EMAIL_FROM}`,
  //       pass: 'sfpeuuboqmxdrewq',
  //     },
  //   });
  // }

  newTransport() {
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT || 587);
    const user = process.env.EMAIL_USERNAME;
    const pass = process.env.EMAIL_PASSWORD;
    const secure = port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  // Send the actual email
  async send(template, subject, payload) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      to: this.to,
      subject,
      payload,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // 3) Send email (prefer Resend if configured)
    if (resend) {
      console.log('resend se ai h')
      try {await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [this.to],
        subject,
        html,
        text: htmlToText.fromString(html),
      })} catch (error) {
        console.log(error);
      }
      return;
    }

    await this.newTransport().sendMail(mailOptions);
    console.log('in1');
  }

  async sendMessage(msg) {
    await this.send('Wallet', msg);
  }

  async sendWelcomeEmail(payload) {
    await this.send('welcome', 'Password Creation Email');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Password Reset Email');
  }

  async sendPackageBuyEmail(payload) {
    await this.send('buyPackage', 'Package Purchased', payload);
  }

  async sendListingBookEmail(payload) {
    await this.send('bookListing', 'Listing Booked', payload);
  }

  async sendPaymentEmail(payload) {
    await this.send('payment', 'Payment Email', payload);
  }

  async sendPasswordResetComfirmation() {
    await this.send(
      'passwordReset',
      'Hr Management Password Change Notification'
    );
  }
};