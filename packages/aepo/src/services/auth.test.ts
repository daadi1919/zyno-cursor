import { AuthService } from './auth';
import { ErrorHandlingService } from './error-handling';

describe('AuthService', () => {
  let authService: AuthService;
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService();
    authService = new AuthService(errorHandlingService);
  });

  describe('createUser', () => {
    it('should create a new user with default role', async () => {
      const user = await authService.createUser('test@example.com');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
      expect(user.apiKey).toBeDefined();
    });

    it('should create a user with specified role', async () => {
      const user = await authService.createUser('admin@example.com', 'admin');
      expect(user.role).toBe('admin');
    });

    it('should not create duplicate users', async () => {
      await authService.createUser('test@example.com');
      await expect(
        authService.createUser('test@example.com')
      ).rejects.toThrow('Un utilisateur avec cet email existe déjà');
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', async () => {
      const user = await authService.createUser('test@example.com');
      const validatedUser = await authService.validateApiKey(user.apiKey);
      expect(validatedUser).toBeDefined();
      expect(validatedUser?.id).toBe(user.id);
    });

    it('should return null for invalid API key', async () => {
      const validatedUser = await authService.validateApiKey('invalid-key');
      expect(validatedUser).toBeNull();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const user = await authService.createUser('test@example.com');
      const updatedUser = await authService.updateUserRole(user.id, 'admin');
      expect(updatedUser.role).toBe('admin');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.updateUserRole('non-existent-id', 'admin')
      ).rejects.toThrow('Utilisateur non trouvé');
    });
  });

  describe('rotateApiKey', () => {
    it('should generate new API key', async () => {
      const user = await authService.createUser('test@example.com');
      const oldApiKey = user.apiKey;
      const newApiKey = await authService.rotateApiKey(user.id);
      expect(newApiKey).not.toBe(oldApiKey);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.rotateApiKey('non-existent-id')
      ).rejects.toThrow('Utilisateur non trouvé');
    });
  });

  describe('validatePermissions', () => {
    it('should validate admin permissions', async () => {
      const admin = await authService.createUser('admin@example.com', 'admin');
      const hasPermission = await authService.validatePermissions(admin.id, 'user');
      expect(hasPermission).toBe(true);
    });

    it('should validate user permissions', async () => {
      const user = await authService.createUser('user@example.com', 'user');
      const hasPermission = await authService.validatePermissions(user.id, 'readonly');
      expect(hasPermission).toBe(true);
    });

    it('should reject insufficient permissions', async () => {
      const readonly = await authService.createUser('readonly@example.com', 'readonly');
      const hasPermission = await authService.validatePermissions(readonly.id, 'admin');
      expect(hasPermission).toBe(false);
    });
  });

  describe('user management', () => {
    it('should get user by ID', async () => {
      const user = await authService.createUser('test@example.com');
      const foundUser = authService.getUserById(user.id);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
    });

    it('should get user by email', async () => {
      await authService.createUser('test@example.com');
      const foundUser = authService.getUserByEmail('test@example.com');
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
    });

    it('should get all users', async () => {
      await authService.createUser('user1@example.com');
      await authService.createUser('user2@example.com');
      const users = authService.getAllUsers();
      expect(users).toHaveLength(2);
    });

    it('should delete user', async () => {
      const user = await authService.createUser('test@example.com');
      await authService.deleteUser(user.id);
      const foundUser = authService.getUserById(user.id);
      expect(foundUser).toBeUndefined();
    });
  });

  describe('last login tracking', () => {
    it('should update last login time', async () => {
      const user = await authService.createUser('test@example.com');
      await authService.updateLastLogin(user.id);
      const updatedUser = authService.getUserById(user.id);
      expect(updatedUser?.lastLogin).toBeDefined();
    });
  });
}); 