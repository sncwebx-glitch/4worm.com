# Geolocation Animal Marketplace

A full-stack geolocation-based marketplace application for buying and selling animals, animal services, and animal-related items locally.

## Features

### Core Features
- **Geolocation-Based Search**: Find animals, services, and items within a specified radius
- **User Authentication**: Secure registration and login with email/password
- **Seller Dashboard**: List animals, services, and items
- **Real-Time Chat**: Socket.IO powered messaging between buyers and sellers
- **Payment Processing**: Stripe integration for online payments and in-person transaction tracking
- **User Profiles**: Complete seller profiles with ratings and reviews
- **Listing Management**: Create, edit, and delete listings

### Categories
- **Animals**: Puppies, kittens, birds, exotic pets, livestock
- **Services**: Grooming, veterinary services, training, pet sitting, boarding
- **Items**: Pet food, toys, accessories, equipment

### Payment Options
- Credit/Debit card payments via Stripe
- In-person cash transactions
- Deposit options for services

### Exchange Methods
- In-person local pickup/exchange
- Shipping for remote sales
- Both options available per listing

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data storage
- **Socket.IO** for real-time chat
- **Stripe** for payment processing
- **Passport.js** for authentication
- **Mongoose** for database ODM

### Frontend (To be implemented)
- React.js
- React Router for navigation
- Socket.IO client for real-time features
- Stripe Elements for payment UI
- Google Maps API for geolocation

## Installation

### Prerequisites
- Node.js 14+
- MongoDB
- Stripe Account
- Cloudinary Account (optional, for image hosting)

### Setup

1. **Clone and install dependencies**
   ```bash
   cd animal-marketplace
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start MongoDB**
   ```bash
   mongod
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout user
- `GET /api/auth/status` - Check authentication status

### Listings
- `GET /api/listings/nearby?latitude=X&longitude=Y&radius=10` - Get nearby listings
- `GET /api/listings/search?category=animals&keyword=puppy&latitude=X&longitude=Y` - Search listings
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create listing (authenticated)
- `PUT /api/listings/:id` - Update listing (owner only)
- `DELETE /api/listings/:id` - Delete listing (owner only)

### Payments
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/in-person` - Record in-person transaction
- `GET /api/payments/history` - Get user's payment history

### Chat
- `GET /api/chat` - Get user's chats
- `GET /api/chat/:chatId` - Get chat with messages
- `POST /api/chat/get-or-create` - Get or create chat with another user
- `POST /api/chat/:chatId/message` - Send message (HTTP fallback)

### Users
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/profile` - Update user profile (authenticated)
- `POST /api/users/become-seller` - Become a seller (authenticated)
- `GET /api/users/:userId/seller-info` - Get seller information

## WebSocket Events (Chat)

### Emit
- `join-chat` - Join a chat room
- `leave-chat` - Leave a chat room
- `send-message` - Send a message
- `user-typing` - Notify others you're typing
- `user-stopped-typing` - Notify others you stopped typing

### Listen
- `message-received` - Receive new message
- `typing` - User is typing
- `stopped-typing` - User stopped typing

## Database Models

### User
- Email, password (hashed)
- Profile info (name, phone, bio, avatar)
- Location (geospatial point)
- Seller status and rating
- Stripe customer and connect IDs

### Listing
- Seller reference
- Title, description, category, subcategory
- Price and price type
- Images
- Location (geospatial point)
- Pet/service/item specific details
- Exchange method options
- Views and favorites

### Payment
- Buyer and seller references
- Listing reference
- Amount and currency
- Stripe payment intent ID
- Status tracking
- Payment method and transaction type

### Chat
- Participants (array of user references)
- Messages array with sender, content, timestamp, read status
- Last message tracking
- Created/updated timestamps

## Security Considerations

- Passwords are hashed with bcryptjs
- Authentication required for sensitive operations
- CORS configured for frontend
- Environment variables for sensitive data
- Stripe handles PCI compliance for payments
- Input validation and sanitization

## Future Enhancements

- Review and rating system
- Advanced search filters (breed, age, price range)
- Image hosting with Cloudinary
- Email notifications
- Favorites/wishlist feature
- Advanced seller verification
- Dispute resolution system
- Analytics dashboard for sellers
- Mobile app development
- Integration with veterinary records
- Pet health insurance partnerships

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
