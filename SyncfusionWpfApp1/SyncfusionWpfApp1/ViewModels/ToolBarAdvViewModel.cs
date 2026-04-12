using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

using Syncfusion.Windows.Shared;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    public class ToolBarAdvViewModel : Observable
    {
		/// <summary>
        /// Maintains the command for menu item 
        /// </summary>
        private ICommand clickCommand;

        /// <summary>
        /// Maintains the command for button
        /// </summary>
        private ICommand buttonCommand;

        /// <summary>
        /// Initializes the  instance of the <see cref="ToolBarAdvViewModel"/>class
        /// </summary>
        public ToolBarAdvViewModel()
        {
            clickCommand = new DelegateCommand<object>(ExecuteMenuItemClick);
            buttonCommand = new DelegateCommand<object>(ExecuteButtonClick);
        }

        /// <summary>
        /// Gets or sets the command for menu item <see cref="ToolBarAdvViewModel"/> class.
        /// </summary>
        public ICommand ClickCommand
        {
            get
            {
                return clickCommand;
            }
        }

        /// <summary>
        /// Gets or sets the command for button <see cref="ToolBarAdvViewModel"/> class.
        /// </summary>
        public ICommand ButtonCommand
        {
            get
            {
                return buttonCommand;
            }
        }

        /// <summary>
        /// Method to execute button click
        /// </summary>
        /// <param name="param">Specifies the object parameter</param>
        private void ExecuteButtonClick(object param)
        {
            MessageBox.Show("MenuItem has been clicked");
        }

        /// <summary>
        /// Method to execute menu item click
        /// </summary>
        /// <param name="param">Specifies the Obejct parameter</param>
        private void ExecuteMenuItemClick(object param)
        {
            MessageBox.Show("The MenuItem" + " " + (param as MenuItem).Header.ToString() + " has been selected");
        }
    }
}
