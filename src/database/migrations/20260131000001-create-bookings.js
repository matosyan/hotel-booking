'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      vendor_booking_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      guest_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      guest_email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      check_in: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      check_out: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      room_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('bookings', ['idempotency_key'], {
      unique: true,
      name: 'bookings_idempotency_key_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bookings');
  },
};
