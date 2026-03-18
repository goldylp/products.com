const PORT = process.env.PORT || 5000;

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Products Store API',
    version: '1.0.0',
    description: 'Swagger documentation for the Products Store backend API.'
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Local development server'
    }
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and current user endpoints' },
    { name: 'Admin Auth', description: 'Admin authentication endpoints' },
    { name: 'Cart', description: 'Authenticated cart synchronization endpoints' },
    { name: 'Products', description: 'Product catalog endpoints' },
    { name: 'Payments', description: 'Stripe payment intent endpoint' },
    { name: 'Shipping', description: 'Shipping rate lookup endpoints' },
    { name: 'Orders', description: 'Order creation and retrieval endpoints' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid email or password' }
        }
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: { type: 'string' },
            example: ['Cart is empty', 'Payment required']
          }
        }
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d01' },
          name: { type: 'string', example: 'Whey Protein Isolate - 5lbs' },
          image: { type: 'string', format: 'uri' },
          price: { type: 'number', format: 'float', example: 79.99 },
          weight: { type: 'number', format: 'float', example: 5 }
        }
      },
      CartItem: {
        type: 'object',
        properties: {
          productId: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d01' },
          name: { type: 'string', example: 'Whey Protein Isolate - 5lbs' },
          price: { type: 'number', format: 'float', example: 79.99 },
          quantity: { type: 'integer', example: 2 },
          image: { type: 'string', format: 'uri' },
          weight: { type: 'number', format: 'float', example: 5 },
          _id: { type: 'string', example: 'cart_line_1' }
        }
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d02' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          cart: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      SignupRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' }
        }
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jane@example.com' }
        }
      },
      ForgotPasswordResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Reset password link has been sent to your email.'
          },
          resetUrl: {
            type: 'string',
            format: 'uri',
            example: 'http://localhost:3000/reset-password/abc123',
            nullable: true
          }
        }
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password', 'confirmPassword'],
        properties: {
          token: { type: 'string', example: 'abc123resettoken' },
          password: { type: 'string', format: 'password', example: 'newsecret123' },
          confirmPassword: { type: 'string', format: 'password', example: 'newsecret123' }
        }
      },
      VerifyEmailRequest: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', example: 'abc123verificationtoken' }
        }
      },
      ValidateResetTokenRequest: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', example: 'abc123resettoken' }
        }
      },
      ValidateResetTokenResponse: {
        type: 'object',
        properties: {
          valid: { type: 'boolean', example: true }
        }
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Password reset successful. You can now sign in.' }
        }
      },
      SignupResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Account created successfully. Please verify your email before signing in.'
          }
        }
      },
      AuthUser: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d02' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: { $ref: '#/components/schemas/AuthUser' },
          cart: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          }
        }
      },
      MeResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          cart: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          }
        }
      },
      AdminAuthUser: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d09' },
          name: { type: 'string', example: 'Site Admin' },
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          profileImage: { type: 'string', format: 'uri', nullable: true },
          role: { type: 'string', example: 'admin' }
        }
      },
      AdminAuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: { $ref: '#/components/schemas/AdminAuthUser' }
        }
      },
      AdminMeResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/AdminAuthUser' }
        }
      },
      CartSyncRequest: {
        type: 'object',
        required: ['cart'],
        properties: {
          cart: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          }
        }
      },
      CartResponse: {
        type: 'object',
        properties: {
          cart: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          }
        }
      },
      CartSyncResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true }
        }
      },
      PaymentIntentRequest: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', format: 'float', example: 129.97 }
        }
      },
      PaymentIntentResponse: {
        type: 'object',
        properties: {
          clientSecret: { type: 'string', example: 'pi_123_secret_abc' }
        }
      },
      ShippingAddress: {
        type: 'object',
        required: ['fullName', 'addressLine1', 'city', 'state', 'zipCode', 'country'],
        properties: {
          fullName: { type: 'string', example: 'Jane Doe' },
          addressLine1: { type: 'string', example: '123 Main St' },
          addressLine2: { type: 'string', example: 'Apt 4B' },
          city: { type: 'string', example: 'Los Angeles' },
          state: { type: 'string', example: 'CA' },
          zipCode: { type: 'string', example: '90001' },
          country: { type: 'string', example: 'United States' }
        }
      },
      BillingAddress: {
        allOf: [{ $ref: '#/components/schemas/ShippingAddress' }]
      },
      ShippingRateRequest: {
        type: 'object',
        required: ['items', 'address'],
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          },
          address: {
            type: 'object',
            required: ['country', 'state', 'city', 'zipCode'],
            properties: {
              addressLine1: { type: 'string', example: '123 Main St' },
              city: { type: 'string', example: 'Los Angeles' },
              state: { type: 'string', example: 'CA' },
              zipCode: { type: 'string', example: '90001' },
              country: { type: 'string', example: 'United States' }
            }
          }
        }
      },
      ShippingRate: {
        type: 'object',
        properties: {
          service: { type: 'string', example: 'UPS Ground' },
          code: { type: 'string', example: '03' },
          price: { type: 'number', format: 'float', example: 11.99 },
          days: { type: 'string', example: '5-7 business days' }
        }
      },
      ShippingRateResponse: {
        type: 'object',
        properties: {
          rates: {
            type: 'array',
            items: { $ref: '#/components/schemas/ShippingRate' }
          },
          weight: { type: 'number', format: 'float', example: 3 },
          mock: { type: 'boolean', example: false }
        }
      },
      OrderItem: {
        type: 'object',
        properties: {
          productId: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d01' },
          name: { type: 'string', example: 'Whey Protein Isolate - 5lbs' },
          price: { type: 'number', format: 'float', example: 79.99 },
          quantity: { type: 'integer', example: 2 },
          image: { type: 'string', format: 'uri' }
        }
      },
      OrderCreateRequest: {
        type: 'object',
        required: ['items', 'total', 'stripePaymentId', 'shippingAddress'],
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' }
          },
          total: { type: 'number', format: 'float', example: 129.97 },
          stripePaymentId: { type: 'string', example: 'pi_123456789' },
          customerEmail: { type: 'string', format: 'email', example: 'jane@example.com' },
          customerPhone: { type: 'string', example: '+15551234567' },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          billingAddress: { $ref: '#/components/schemas/BillingAddress' },
          sameAsBilling: { type: 'boolean', example: true },
          shippingCost: { type: 'number', format: 'float', example: 11.99 },
          shippingService: { type: 'string', example: 'UPS Ground' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f3a32b0c2ebd78b7bb7d03' },
          userId: { type: 'string', nullable: true, example: '65f3a32b0c2ebd78b7bb7d02' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' }
          },
          total: { type: 'number', format: 'float', example: 129.97 },
          shippingCost: { type: 'number', format: 'float', example: 11.99 },
          shippingMethod: { type: 'string', example: 'UPS Ground' },
          stripePaymentId: { type: 'string', example: 'pi_123456789' },
          customerEmail: { type: 'string', format: 'email', example: 'jane@example.com' },
          customerPhone: { type: 'string', example: '+15551234567' },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          billingAddress: { $ref: '#/components/schemas/BillingAddress' },
          sameAsBilling: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalOrders: { type: 'integer', example: 24 },
          totalPages: { type: 'integer', example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false }
        }
      },
      MyOrdersResponse: {
        type: 'object',
        properties: {
          orders: {
            type: 'array',
            items: { $ref: '#/components/schemas/Order' }
          },
          pagination: { $ref: '#/components/schemas/PaginationMeta' }
        }
      }
    }
  },
  paths: {
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignupRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully and verification email sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SignupResponse' }
              }
            }
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          400: {
            description: 'Invalid credentials or missing fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'User email is not verified yet',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Authenticated user returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeResponse' }
              }
            }
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify a user email address using the email verification token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyEmailRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Email verified successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' }
              }
            }
          },
          400: {
            description: 'Verification link is invalid or expired',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Generate a password reset link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset request processed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ForgotPasswordResponse' }
              }
            }
          },
          400: {
            description: 'Missing email',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using a reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' }
              }
            }
          },
          400: {
            description: 'Invalid token or validation failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/validate-reset-token': {
      post: {
        tags: ['Auth'],
        summary: 'Validate a password reset token before showing the reset form',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidateResetTokenRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Reset token is valid',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidateResetTokenResponse' }
              }
            }
          },
          400: {
            description: 'Reset token is invalid, expired, or already used',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/admin/auth/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Authenticate an admin user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Admin authenticated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminAuthResponse' }
              }
            }
          },
          400: {
            description: 'Missing credentials or invalid email/password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/admin/auth/forgot-password': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Generate an admin password reset link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Admin password reset request processed',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ForgotPasswordResponse' },
                    {
                      type: 'object',
                      properties: {
                        resetUrl: {
                          example: 'http://localhost:3000/admin/reset-password/abc123'
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: 'Missing email',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/admin/auth/reset-password': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Reset an admin password using a reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Admin password reset completed',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/MessageResponse' },
                    {
                      type: 'object',
                      properties: {
                        message: { example: 'Admin password reset successful. You can now sign in.' }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: 'Invalid token or validation failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/admin/auth/validate-reset-token': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Validate an admin password reset token before showing the reset form',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidateResetTokenRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Admin reset token is valid',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidateResetTokenResponse' }
              }
            }
          },
          400: {
            description: 'Reset token is invalid, expired, or already used',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/admin/auth/me': {
      get: {
        tags: ['Admin Auth'],
        summary: 'Get the authenticated admin user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Authenticated admin returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminMeResponse' }
              }
            }
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Admin user not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/cart/sync': {
      post: {
        tags: ['Cart'],
        summary: 'Replace the authenticated user cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CartSyncRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Cart updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CartSyncResponse' }
              }
            }
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get the authenticated user cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CartResponse' }
              }
            }
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List all products',
        responses: {
          200: {
            description: 'Product list returned',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' }
                }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/create-payment-intent': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe payment intent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentIntentRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Payment intent created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentIntentResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/shipping/rates': {
      post: {
        tags: ['Shipping'],
        summary: 'Get shipping rates from UPS or fallback mock rates',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ShippingRateRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Shipping rates returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ShippingRateResponse' }
              }
            }
          },
          400: {
            description: 'Missing cart or address fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Unexpected server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create a new order',
        description: 'Accepts an optional Bearer token. When present and valid, the created order is linked to the authenticated user.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderCreateRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order by id',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'MongoDB order id'
          }
        ],
        responses: {
          200: {
            description: 'Order returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' }
              }
            }
          },
          404: {
            description: 'Order not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/my-orders': {
      get: {
        tags: ['Orders'],
        summary: 'List orders for the authenticated user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            description: 'Orders per page'
          }
        ],
        responses: {
          200: {
            description: 'Orders returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MyOrdersResponse' }
              }
            }
          },
          401: {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = swaggerDocument;
