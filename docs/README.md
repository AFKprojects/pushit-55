# Project Documentation

This directory contains comprehensive documentation for the poll application's architecture and data flow.

## Files

- **`database-schema.md`** - Complete database schema with entity relationships and table descriptions
- **`application-flow.md`** - User flows, API interactions, and state management diagrams

## Overview

The application is a real-time polling system built with:
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database + Authentication + Real-time)
- **State Management**: Custom React hooks
- **Real-time**: Supabase subscriptions

## Key Features

1. **Poll Creation & Voting** - Users can create polls and vote with edit capability
2. **Real-time Updates** - Live synchronization of votes and statistics
3. **Session Management** - Heartbeat system for activity tracking
4. **Push System** - User-driven poll promotion with limits
5. **Poll Lifecycle** - Automatic expiration and archiving

## Development Notes

- All database interactions use Supabase client
- Real-time features rely on Supabase subscriptions
- Authentication supports email/password and Google OAuth
- Edge functions handle automated poll management
- Frontend state managed through custom hooks

For detailed technical information, refer to the individual documentation files.