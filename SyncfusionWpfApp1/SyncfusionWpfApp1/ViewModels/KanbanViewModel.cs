using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using Syncfusion.UI.Xaml.Kanban;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;

namespace SyncfusionWpfApp1.ViewModels
{
    public class KanbanViewModel : Observable
    {
        public ObservableCollection<KanbanModel> Tasks { get; set; }

        public KanbanViewModel()
        {
            Tasks = new ObservableCollection<KanbanModel>();
            Tasks.Add(new KanbanModel()
            {
                Title = "Universal App",
                ID = "27654",
                Description = "Incorporate feedback into functional specifications",
                Category = "Open",
                ColorKey = "Low",
                Tags = new string[] { "Deployment" },
                ImageURL = new Uri("/images/icon.jpg", UriKind.RelativeOrAbsolute)
            });

            Tasks.Add(new KanbanModel()
            {
                Title = "Universal App",
                ID = "29477",
                Description = "Design functional specifications",
                Category = "In Progress",
                ColorKey = "Normal",
                Tags = new string[] { "Design" },
                ImageURL = new Uri("/images/icon.jpg", UriKind.RelativeOrAbsolute)
            });

            Tasks.Add(new KanbanModel()
            {
                Title = "Universal App",
                ID = "25678",
                Description = "Review preliminary software specifications",
                Category = "Done",
                ColorKey = "Low",
                Tags = new string[] { "Analysis" },
                ImageURL = new Uri("/images/icon.jpg", UriKind.RelativeOrAbsolute)
            });

            Tasks.Add(new KanbanModel()
            {
                Title = "Universal App",
                ID = "6593",
                Description = "Draft preliminary software specifications",
                Category = "Review",
                ColorKey = "High",
                Tags = new string[] { "Analysis" },
                ImageURL = new Uri("/images/icon.jpg", UriKind.RelativeOrAbsolute)
            });
        }
    }
}
